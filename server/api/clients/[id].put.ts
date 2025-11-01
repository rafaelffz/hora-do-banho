import { db } from "~~/server/database"
import {
  clients,
  updateClientWithPetsAndSubscriptionsSchema,
  pets,
  clientSubscriptions,
  packagePrices,
} from "~~/server/database/schema"
import { sendZodError } from "~~/server/utils/sendZodError"
import { eq, inArray } from "drizzle-orm"
import {
  calculateNextPickupDate,
  applyAdjustment,
  calculateMultiPetDiscount,
} from "~~/server/database/schema/client-subscriptions"

export default defineAuthenticatedEventHandler(async event => {
  const clientId = getRouterParam(event, "id")

  if (!clientId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Client id is required!",
    })
  }

  const result = await readValidatedBody(
    event,
    updateClientWithPetsAndSubscriptionsSchema.safeParse
  )

  if (!result.success) {
    return sendZodError(event, result.error)
  }

  const session = await getUserSession(event)

  try {
    const existingClient = await db.query.clients.findFirst({
      where: eq(clients.id, clientId),
      with: {
        pets: {
          columns: {
            id: true,
            name: true,
            breed: true,
            size: true,
            weight: true,
            notes: true,
            clientId: true,
          },
        },
        subscriptions: {
          columns: {
            id: true,
            petId: true,
            packagePriceId: true,
            pickupDayOfWeek: true,
            pickupTime: true,
            basePrice: true,
            finalPrice: true,
            adjustmentPercentage: true,
            adjustmentReason: true,
            startDate: true,
            isActive: true,
            notes: true,
          },
        },
      },
    })

    if (!existingClient) {
      throw createError({
        statusCode: 404,
        statusMessage: "Client not found",
      })
    }

    if (existingClient.userId !== session.user.id) {
      throw createError({
        statusCode: 403,
        statusMessage: "You do not have permission to edit this client",
      })
    }

    const response = await db.transaction(async tx => {
      const updateData = Object.fromEntries(
        Object.entries(result.data)
          .filter(([key]) => key !== "pets")
          .map(([key, value]) => [key, value === "" ? null : value])
      )

      let updatedClient = existingClient
      if (Object.keys(updateData).length > 0) {
        const [client] = await tx
          .update(clients)
          .set({ ...updateData, id: clientId })
          .where(eq(clients.id, clientId))
          .returning({
            id: clients.id,
            name: clients.name,
            email: clients.email,
            avatar: clients.avatar,
            phone: clients.phone,
            address: clients.address,
            notes: clients.notes,
            createdAt: clients.createdAt,
            updatedAt: clients.updatedAt,
          })
        updatedClient = { ...existingClient, ...client }
      }

      let petsResult: any[] = []
      let subscriptionsResult: any[] = []

      console.log(result.data)

      const existingPets = result.data.pets?.filter(pet => pet.id && pet.id.trim() !== "")
      const newPets = result.data.pets?.filter(
        pet => !pet.id || pet.id.trim() === "" || pet.id.includes("temp")
      )

      const existingPetIds = existingPets?.map(pet => pet.id)
      const currentPetIds = existingClient.pets.map(pet => pet.id)

      const petsToDelete = currentPetIds.filter(id => !existingPetIds?.includes(id))
      if (petsToDelete.length > 0) {
        await tx
          .update(clientSubscriptions)
          .set({ isActive: false })
          .where(inArray(clientSubscriptions.petId, petsToDelete))

        await tx.delete(pets).where(inArray(pets.id, petsToDelete))
      }

      for (const pet of existingPets || []) {
        if (pet.name && pet.id) {
          const [updatedPet] = await tx
            .update(pets)
            .set({
              name: pet.name,
              breed: pet.breed || null,
              size: pet.size || null,
              weight: pet.weight || null,
              notes: pet.notes || null,
            })
            .where(eq(pets.id, pet.id))
            .returning()

          if (updatedPet) {
            petsResult.push(updatedPet)

            if (pet.subscription) {
              const existingSubscription = existingClient.subscriptions.find(
                sub => sub.petId === pet.id
              )

              if (existingSubscription) {
                await updateSubscription(
                  tx,
                  existingSubscription.id,
                  pet.subscription,
                  result.data.pets!.length
                )
              } else {
                // Criar nova subscription
                const newSubscription = await createSubscription(
                  tx,
                  clientId,
                  pet.id,
                  pet.subscription,
                  result.data.pets!.filter(p => p.subscription).length
                )
                subscriptionsResult.push(newSubscription)
              }
            } else if (existingClient.subscriptions.find(sub => sub.petId === pet.id)) {
              // Desativar subscription se não há mais dados de subscription
              await tx
                .update(clientSubscriptions)
                .set({ isActive: false })
                .where(eq(clientSubscriptions.petId, pet.id))
            }
          }
        }
      }

      if (newPets.length > 0) {
        const petsToInsert = newPets
          .filter(pet => pet.name)
          .map(pet => ({
            name: pet.name!,
            clientId,
            breed: pet.breed || null,
            size: pet.size || null,
            weight: pet.weight || null,
            notes: pet.notes || null,
          }))

        if (petsToInsert.length > 0) {
          const insertedPets = await tx.insert(pets).values(petsToInsert).returning()
          petsResult.push(...insertedPets)

          // Criar subscriptions para novos pets
          for (let i = 0; i < newPets.length; i++) {
            const petData = newPets[i]
            if (petData.subscription && petData.name) {
              const petRecord = insertedPets.find(p => p.name === petData.name)
              if (petRecord) {
                const newSubscription = await createSubscription(
                  tx,
                  clientId,
                  petRecord.id,
                  petData.subscription,
                  result.data.pets!.filter(p => p.subscription).length
                )
                subscriptionsResult.push(newSubscription)
              }
            }
          }
        }
      }

      return {
        client: updatedClient,
        pets: petsResult,
        subscriptions: subscriptionsResult,
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

async function createSubscription(
  tx: any,
  clientId: string,
  petId: string,
  subscriptionData: any,
  totalPetsWithSubscription: number
) {
  // Buscar preço base do pacote
  const packagePrice = await tx.query.packagePrices.findFirst({
    where: eq(packagePrices.id, subscriptionData.packagePriceId),
    with: {
      package: true,
    },
  })

  if (!packagePrice) {
    throw createError({
      statusCode: 400,
      statusMessage: "Preço do pacote não encontrado",
    })
  }

  const basePrice = packagePrice.price

  // Calcular desconto para múltiplos pets
  let adjustmentPercentage = subscriptionData.adjustmentPercentage || 0
  if (totalPetsWithSubscription > 1 && !adjustmentPercentage) {
    adjustmentPercentage = calculateMultiPetDiscount(totalPetsWithSubscription)
  }

  // Aplicar ajuste
  const { finalPrice, adjustmentValue } = applyAdjustment(basePrice, adjustmentPercentage)

  // Calcular próxima data de coleta
  const nextPickupDate = calculateNextPickupDate(
    subscriptionData.startDate,
    packagePrice.recurrence || 7,
    subscriptionData.pickupDayOfWeek
  )

  const [subscription] = await tx
    .insert(clientSubscriptions)
    .values({
      clientId,
      petId,
      packagePriceId: subscriptionData.packagePriceId,
      pickupDayOfWeek: subscriptionData.pickupDayOfWeek,
      pickupTime: subscriptionData.pickupTime || null,
      nextPickupDate,
      basePrice,
      finalPrice,
      adjustmentValue,
      adjustmentPercentage,
      adjustmentReason: subscriptionData.adjustmentReason || null,
      startDate: subscriptionData.startDate,
      notes: subscriptionData.notes || null,
    })
    .returning()

  return subscription
}

async function updateSubscription(
  tx: any,
  subscriptionId: string,
  subscriptionData: any,
  totalPetsWithSubscription: number
) {
  // Buscar preço base do pacote
  const packagePrice = await tx.query.packagePrices.findFirst({
    where: eq(packagePrices.id, subscriptionData.packagePriceId),
    with: {
      package: true,
    },
  })

  if (!packagePrice) {
    throw createError({
      statusCode: 400,
      statusMessage: "Preço do pacote não encontrado",
    })
  }

  const basePrice = packagePrice.price

  // Calcular desconto para múltiplos pets
  let adjustmentPercentage = subscriptionData.adjustmentPercentage || 0
  if (totalPetsWithSubscription > 1 && !adjustmentPercentage) {
    adjustmentPercentage = calculateMultiPetDiscount(totalPetsWithSubscription)
  }

  // Aplicar ajuste
  const { finalPrice, adjustmentValue } = applyAdjustment(basePrice, adjustmentPercentage)

  // Calcular próxima data de coleta
  const nextPickupDate = calculateNextPickupDate(
    subscriptionData.startDate,
    packagePrice.recurrence || 7,
    subscriptionData.pickupDayOfWeek
  )

  const [subscription] = await tx
    .update(clientSubscriptions)
    .set({
      packagePriceId: subscriptionData.packagePriceId,
      pickupDayOfWeek: subscriptionData.pickupDayOfWeek,
      pickupTime: subscriptionData.pickupTime || null,
      nextPickupDate,
      basePrice,
      finalPrice,
      adjustmentValue,
      adjustmentPercentage,
      adjustmentReason: subscriptionData.adjustmentReason || null,
      startDate: subscriptionData.startDate,
      notes: subscriptionData.notes || null,
      isActive: subscriptionData.isActive !== undefined ? subscriptionData.isActive : true,
    })
    .where(eq(clientSubscriptions.id, subscriptionId))
    .returning()

  return subscription
}
