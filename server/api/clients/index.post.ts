import { eq } from "drizzle-orm"
import { db } from "~~/server/database"
import {
  clients,
  clientSubscriptions,
  insertClientWithPetsAndSubscriptionsSchema,
  InsertScheduling,
  packagePrices,
  pets,
  schedulingPets,
  schedulings,
  UpdatePet,
  UpdatePetWithSubscriptions,
} from "~~/server/database/schema"
import {
  applyAdjustment,
  calculateMultiPetDiscount,
} from "~~/server/database/schema/client-subscriptions"
import { sendZodError } from "~~/server/utils/sendZodError"

const generateSchedulingDates = (
  startDate: number,
  recurrence: number,
  pickupDayOfWeek: number,
  maxDays: number = 30
): number[] => {
  const dates: number[] = []
  const now = Date.now()
  const start = new Date(Math.max(startDate, now))
  const maxDate = new Date(now + maxDays * 24 * 60 * 60 * 1000)

  let currentDate = new Date(start)
  const currentDayOfWeek = currentDate.getDay()

  let daysToAdd = pickupDayOfWeek - currentDayOfWeek
  if (daysToAdd < 0) {
    daysToAdd += 7
  } else if (daysToAdd === 0) {
    const currentHour = currentDate.getHours()
    if (currentHour >= 12) {
      daysToAdd = 7
    }
  }

  currentDate.setDate(currentDate.getDate() + daysToAdd)

  while (currentDate <= maxDate) {
    dates.push(currentDate.getTime())

    currentDate = new Date(currentDate.getTime() + recurrence * 24 * 60 * 60 * 1000)
  }

  return dates
}

export default defineAuthenticatedEventHandler(async event => {
  const result = await readValidatedBody(
    event,
    insertClientWithPetsAndSubscriptionsSchema.safeParse
  )

  if (!result.success) {
    return sendZodError(event, result.error)
  }

  const session = await getUserSession(event)

  try {
    const response = await db.transaction(async tx => {
      const [client] = await tx
        .insert(clients)
        .values({
          userId: session.user.id,
          name: result.data.name,
          email: result.data.email || null,
          phone: result.data.phone || null,
          address: result.data.address || null,
          notes: result.data.notes || null,
        })
        .returning()

      let petsResponse: any[] = []
      let subscriptionsResponse: any[] = []

      if (result.data.pets?.length && client?.id) {
        const petsToInsert = result.data.pets.map((pet: UpdatePet) => ({
          name: pet.name,
          clientId: client.id,
          breed: pet.breed || null,
          size: pet.size || null,
          weight: pet.weight || null,
          notes: pet.notes || null,
        }))

        petsResponse = await tx.insert(pets).values(petsToInsert).returning()

        const petsWithSubscriptions = result.data.pets.filter(
          (pet: UpdatePetWithSubscriptions) => pet.subscription
        )

        if (petsWithSubscriptions.length > 0) {
          const subscriptionsToInsert = []

          for (let i = 0; i < petsWithSubscriptions.length; i++) {
            const petData = petsWithSubscriptions[i]
            const petIndex = result.data.pets.findIndex(
              (p: UpdatePetWithSubscriptions) => p.name === petData.name
            )

            if (petIndex === -1) {
              throw createError({
                statusCode: 400,
                statusMessage: `Pet ${petData.name} não encontrado na lista de pets`,
              })
            }

            const petRecord = petsResponse[petIndex]

            if (!petRecord) {
              throw createError({
                statusCode: 400,
                statusMessage: `Erro ao criar pet ${petData.name}`,
              })
            }

            const subscription = petData.subscription!

            const packagePrice = await tx.query.packagePrices.findFirst({
              where: eq(packagePrices.id, subscription.packagePriceId),
              with: {
                package: true,
              },
            })

            if (!packagePrice) {
              throw createError({
                statusCode: 400,
                statusMessage: `Preço do pacote não encontrado para o pet ${petData.name}`,
              })
            }

            const basePrice = packagePrice.price
            let adjustmentPercentage = subscription.adjustmentPercentage || 0

            if (i === 0) {
              adjustmentPercentage += calculateMultiPetDiscount(petsWithSubscriptions.length)
            }

            const { finalPrice, adjustmentValue } = applyAdjustment(basePrice, adjustmentPercentage)

            const nextPickupDate = subscription.startDate

            subscriptionsToInsert.push({
              clientId: client.id,
              petId: petRecord.id,
              packagePriceId: subscription.packagePriceId,
              pickupDayOfWeek: subscription.pickupDayOfWeek,
              pickupTime: subscription.pickupTime || null,
              nextPickupDate,
              basePrice,
              finalPrice,
              adjustmentValue,
              adjustmentPercentage,
              adjustmentReason: adjustmentValue !== 0 ? "desconto_multiplos_pets" : null,
              startDate: subscription.startDate,
              notes: subscription.notes || null,
            })
          }

          if (subscriptionsToInsert.length > 0) {
            subscriptionsResponse = await tx
              .insert(clientSubscriptions)
              .values(subscriptionsToInsert)
              .returning()

            const packagePricesWithSubscriptions = await tx.query.packagePrices.findMany({
              where: (packagePrices, { inArray }) =>
                inArray(
                  packagePrices.id,
                  subscriptionsResponse.map(sub => sub.packagePriceId)
                ),
            })

            type SchedulingGroup = {
              recurrence: number
              pickupDayOfWeek: number
              subscriptions: typeof subscriptionsResponse
            }

            const schedulingGroups = subscriptionsResponse.reduce(
              (groups: Record<string, SchedulingGroup>, subscription) => {
                const packagePrice = packagePricesWithSubscriptions.find(
                  pp => pp.id === subscription.packagePriceId
                )

                if (!packagePrice) return groups

                const groupKey = `${packagePrice.recurrence}-${subscription.pickupDayOfWeek}`

                if (!groups[groupKey]) {
                  groups[groupKey] = {
                    recurrence: packagePrice.recurrence,
                    pickupDayOfWeek: subscription.pickupDayOfWeek,
                    subscriptions: [],
                  }
                }

                groups[groupKey].subscriptions.push(subscription)
                return groups
              },
              {}
            )

            const schedulingsToInsert: InsertScheduling[] = []
            const schedulingPetsToInsert: Array<{
              schedulingIndex: number
              petId: string
              packagePriceId: string
            }> = []

            let schedulingIndex = 0

            Object.values(schedulingGroups).forEach((group: SchedulingGroup) => {
              const totalBasePrice = group.subscriptions.reduce(
                (sum: number, sub) => sum + sub.basePrice,
                0
              )
              const totalFinalPrice = group.subscriptions.reduce(
                (sum: number, sub) => sum + sub.finalPrice,
                0
              )

              const firstSubscription = group.subscriptions[0]
              const startDate = firstSubscription.nextPickupDate || firstSubscription.startDate

              const schedulingDates = generateSchedulingDates(
                startDate,
                group.recurrence,
                group.pickupDayOfWeek,
                30
              )

              schedulingDates.forEach(date => {
                schedulingsToInsert.push({
                  clientId: client.id,
                  pickupDate: date,
                  basePrice: totalBasePrice,
                  finalPrice: totalFinalPrice,
                })

                group.subscriptions.forEach(subscription => {
                  schedulingPetsToInsert.push({
                    schedulingIndex: schedulingIndex,
                    petId: subscription.petId,
                    packagePriceId: subscription.packagePriceId,
                  })
                })

                schedulingIndex++
              })
            })

            if (schedulingsToInsert.length > 0) {
              const schedulingsSaved = await tx
                .insert(schedulings)
                .values(schedulingsToInsert)
                .returning()

              const schedulingPetsValues = schedulingPetsToInsert.map(item => ({
                schedulingId: schedulingsSaved[item.schedulingIndex].id,
                petId: item.petId,
                packagePriceId: item.packagePriceId,
              }))

              await tx.insert(schedulingPets).values(schedulingPetsValues)
            }
          }
        }
      }

      return {
        client,
        pets: petsResponse,
        subscriptions: subscriptionsResponse,
      }
    })

    return response
  } catch (error: any) {
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: "Unknown error",
      data: error,
    })
  }
})
