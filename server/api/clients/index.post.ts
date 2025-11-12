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
              adjustmentReason: subscription.adjustmentReason || null,
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

            Object.values(schedulingGroups).forEach((group: SchedulingGroup, index: number) => {
              const totalBasePrice = group.subscriptions.reduce(
                (sum: number, sub) => sum + sub.basePrice,
                0
              )
              const totalFinalPrice = group.subscriptions.reduce(
                (sum: number, sub) => sum + sub.finalPrice,
                0
              )

              const firstSubscription = group.subscriptions[0]

              schedulingsToInsert.push({
                clientId: client.id,
                pickupDate: firstSubscription.nextPickupDate || firstSubscription.startDate,
                basePrice: totalBasePrice,
                finalPrice: totalFinalPrice,
              })

              group.subscriptions.forEach(subscription => {
                schedulingPetsToInsert.push({
                  schedulingIndex: index,
                  petId: subscription.petId,
                  packagePriceId: subscription.packagePriceId,
                })
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
