import { db } from "~~/server/database"
import {
  clients,
  insertClientWithPetsAndSubscriptionsSchema,
  pets,
  clientSubscriptions,
  packagePrices,
} from "~~/server/database/schema"
import { sendZodError } from "~~/server/utils/sendZodError"
import { eq } from "drizzle-orm"
import {
  calculateNextPickupDate,
  applyAdjustment,
  calculateMultiPetDiscount,
} from "~~/server/database/schema/client-subscriptions"

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
        const petsToInsert = result.data.pets.map(pet => ({
          name: pet.name!,
          clientId: client.id,
          breed: pet.breed || null,
          size: pet.size || null,
          weight: pet.weight || null,
          notes: pet.notes || null,
        }))

        petsResponse = await tx.insert(pets).values(petsToInsert).returning()

        const petsWithSubscriptions = result.data.pets.filter(pet => pet.subscription)

        if (petsWithSubscriptions.length > 0) {
          const subscriptionsToInsert = []

          for (let i = 0; i < petsWithSubscriptions.length; i++) {
            const petData = petsWithSubscriptions[i]
            const petIndex = result.data.pets.findIndex(p => p.name === petData.name)

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

            const nextPickupDate = calculateNextPickupDate(
              subscription.startDate,
              packagePrice.recurrence || 7,
              subscription.pickupDayOfWeek
            )

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
