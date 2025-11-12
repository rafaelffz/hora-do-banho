import { and, eq, gte, inArray } from "drizzle-orm"
import { db } from "~~/server/database"
import {
  clients,
  clientSubscriptions,
  packagePrices,
  pets,
  schedulingPets,
  schedulings,
  updateClientWithPetsAndSubscriptionsSchema,
  UpdatePet,
  UpdatePetWithSubscriptions,
} from "~~/server/database/schema"
import { calculateSubscriptionPricing } from "~~/server/utils/calculateSubscriptionPricing"
import { sendZodError } from "~~/server/utils/sendZodError"

const createSubscription = async (
  tx: any,
  clientId: string,
  petId: string,
  subscriptionData: any,
  totalPetsWithSubscription: number,
  isFirstPet: boolean = false
) => {
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
  const pricing = calculateSubscriptionPricing(
    basePrice,
    subscriptionData,
    totalPetsWithSubscription,
    isFirstPet
  )

  const [subscription] = await tx
    .insert(clientSubscriptions)
    .values({
      clientId,
      petId,
      packagePriceId: subscriptionData.packagePriceId,
      pickupDayOfWeek: subscriptionData.pickupDayOfWeek,
      pickupTime: subscriptionData.pickupTime || null,
      nextPickupDate: subscriptionData.startDate,
      basePrice,
      finalPrice: pricing.finalPrice,
      adjustmentValue: pricing.adjustmentValue,
      adjustmentPercentage: pricing.adjustmentPercentage,
      adjustmentReason: pricing.adjustmentReason,
      startDate: subscriptionData.startDate,
      notes: subscriptionData.notes || null,
    })
    .returning()

  return subscription
}

const updateSubscription = async (
  tx: any,
  subscriptionId: string,
  subscriptionData: any,
  totalPetsWithSubscription: number,
  isFirstPet: boolean = false
) => {
  const packagePrice = await tx.query.packagePrices.findFirst({
    where: eq(packagePrices.id, subscriptionData.packagePriceId),
    with: {
      package: true,
    },
  })

  if (!packagePrice) {
    throw createError({
      statusCode: 400,
      statusMessage: "Package price not found",
    })
  }

  const basePrice = packagePrice.price
  const pricing = calculateSubscriptionPricing(
    basePrice,
    subscriptionData,
    totalPetsWithSubscription,
    isFirstPet
  )

  const [subscription] = await tx
    .update(clientSubscriptions)
    .set({
      packagePriceId: subscriptionData.packagePriceId,
      pickupDayOfWeek: subscriptionData.pickupDayOfWeek,
      pickupTime: subscriptionData.pickupTime || null,
      nextPickupDate: subscriptionData.startDate,
      basePrice,
      finalPrice: pricing.finalPrice,
      adjustmentValue: pricing.adjustmentValue,
      adjustmentPercentage: pricing.adjustmentPercentage,
      adjustmentReason: pricing.adjustmentReason,
      startDate: subscriptionData.startDate,
      notes: subscriptionData.notes || null,
      isActive: subscriptionData.isActive !== undefined ? subscriptionData.isActive : true,
    })
    .where(eq(clientSubscriptions.id, subscriptionId))
    .returning()

  return subscription
}

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

      const existingPets = result.data.pets?.filter(
        (pet: UpdatePet) => pet.id && pet.id.trim() !== ""
      )
      const newPets = result.data.pets?.filter(
        (pet: UpdatePet) => !pet.id || pet.id.trim() === "" || pet.id.includes("temp")
      )

      const existingPetIds = existingPets?.map((pet: UpdatePet) => pet.id)
      const currentPetIds = existingClient.pets.map(pet => pet.id)

      const petsToDelete = currentPetIds.filter(id => !existingPetIds?.includes(id))
      if (petsToDelete.length > 0) {
        await tx.delete(clientSubscriptions).where(inArray(clientSubscriptions.petId, petsToDelete))
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

              const petsWithSubscriptions = result.data.pets?.filter(
                (pet: UpdatePetWithSubscriptions) => pet.subscription
              )
              const petFound = petsWithSubscriptions?.find((p: UpdatePet) => p.id === pet.id)
              const petIndex = petsWithSubscriptions?.findIndex((p: UpdatePet) => p.id === pet.id)

              if (existingSubscription) {
                await updateSubscription(
                  tx,
                  existingSubscription.id,
                  pet.subscription,
                  petsWithSubscriptions ? petsWithSubscriptions.length : 0,
                  petIndex === 0
                )
              } else {
                const newSubscription = await createSubscription(
                  tx,
                  clientId,
                  pet.id,
                  pet.subscription,
                  petsWithSubscriptions ? petsWithSubscriptions.length : 0,
                  petIndex === 0
                )
                subscriptionsResult.push(newSubscription)
              }
            } else if (existingClient.subscriptions.find(sub => sub.petId === pet.id)) {
              await tx.delete(clientSubscriptions).where(eq(clientSubscriptions.petId, pet.id))
            }
          }
        }
      }

      if (newPets && newPets.length > 0) {
        const petsToInsert = newPets
          .filter((pet: UpdatePet) => pet.name)
          .map((pet: UpdatePet) => ({
            name: pet.name,
            clientId,
            breed: pet.breed || null,
            size: pet.size || null,
            weight: pet.weight || null,
            notes: pet.notes || null,
          }))

        if (petsToInsert.length > 0) {
          const insertedPets = await tx.insert(pets).values(petsToInsert).returning()
          petsResult.push(...insertedPets)

          for (let i = 0; i < newPets.length; i++) {
            const petData = newPets[i]

            if (petData.subscription && petData.name) {
              const petRecord = insertedPets.find(p => p.name === petData.name)
              if (petRecord) {
                const petsWithSubscriptions = result.data.pets!.filter(
                  (p: UpdatePetWithSubscriptions) => p.subscription
                )
                const existingPetsWithSubs = (existingPets || []).filter(
                  (p: UpdatePetWithSubscriptions) => p.subscription
                ).length
                const isFirstPet = existingPetsWithSubs === 0 && i === 0

                const newSubscription = await createSubscription(
                  tx,
                  clientId,
                  petRecord.id,
                  petData.subscription,
                  petsWithSubscriptions.length,
                  isFirstPet
                )
                subscriptionsResult.push(newSubscription)
              }
            }
          }
        }
      }

      const schedulingPetsResult = await tx
        .select()
        .from(schedulingPets)
        .innerJoin(schedulings, eq(schedulingPets.schedulingId, schedulings.id))
        .innerJoin(packagePrices, eq(schedulingPets.packagePriceId, packagePrices.id))
        .where(
          and(
            inArray(
              schedulingPets.petId,
              petsResult.map(p => p.id)
            ),
            eq(schedulings.clientId, clientId),
            eq(schedulings.status, "scheduled"),
            gte(schedulings.pickupDate, Date.now())
          )
        )

      if (schedulingPetsResult.length > 0) {
        const schedulingPetsOnSameScheduling = schedulingPetsResult.reduce((acc, sp) => {
          const spKey = sp.schedulings.id

          if (!acc[spKey]) {
            acc[spKey] = []
          }

          acc[spKey].push(sp)
          return acc
        }, {} as Record<string, (typeof schedulingPetsResult)[number][]>)

        for (const spGroupKey in schedulingPetsOnSameScheduling) {
          const spGroup = schedulingPetsOnSameScheduling[spGroupKey]

          const currentSubscriptions = await tx.query.clientSubscriptions.findMany({
            where: and(
              eq(clientSubscriptions.clientId, clientId),
              inArray(
                clientSubscriptions.petId,
                spGroup.map(sp => sp.scheduling_pets.petId)
              ),
              eq(clientSubscriptions.isActive, true)
            ),
            with: {
              packagePrice: true,
            },
          })

          const petsWithDivergences = spGroup.filter(sp => {
            const currentSub = currentSubscriptions.find(
              sub => sub.petId === sp.scheduling_pets.petId
            )

            if (!currentSub) return false

            const originalScheduling = sp.schedulings
            const originalSchedulingDate = new Date(originalScheduling.pickupDate)
            const originalPickupDayOfWeek = originalSchedulingDate.getDay()
            const originalRecurrence = sp.package_prices?.recurrence

            const hasPickupDayDivergence = currentSub.pickupDayOfWeek !== originalPickupDayOfWeek
            const hasRecurrenceDivergence =
              currentSub.packagePrice.recurrence !== originalRecurrence

            return hasPickupDayDivergence || hasRecurrenceDivergence
          })

          if (petsWithDivergences.length > 0) {
            const petsByNewConfig = petsWithDivergences.reduce((acc, sp) => {
              const currentSub = currentSubscriptions.find(
                sub => sub.petId === sp.scheduling_pets.petId
              )
              const configKey = `${currentSub?.pickupDayOfWeek}-${currentSub?.packagePrice?.recurrence}`

              if (!acc[configKey]) {
                acc[configKey] = {
                  pets: [],
                  subscription: currentSub!,
                }
              }

              acc[configKey].pets.push(sp)
              return acc
            }, {} as Record<string, { pets: typeof petsWithDivergences; subscription: (typeof currentSubscriptions)[0] }>)

            for (const configKey in petsByNewConfig) {
              const { pets: configPets, subscription } = petsByNewConfig[configKey]

              const nextPickupDate =
                subscription.nextPickupDate || Date.now() + 7 * 24 * 60 * 60 * 1000

              const totalBasePrice = configPets.reduce((sum, sp) => {
                const sub = currentSubscriptions.find(s => s.petId === sp.scheduling_pets.petId)
                return sum + (sub?.basePrice || 0)
              }, 0)

              const totalFinalPrice = configPets.reduce((sum, sp) => {
                const sub = currentSubscriptions.find(s => s.petId === sp.scheduling_pets.petId)
                return sum + (sub?.finalPrice || 0)
              }, 0)

              const [newScheduling] = await tx
                .insert(schedulings)
                .values({
                  clientId,
                  pickupDate: nextPickupDate,
                  pickupTime: subscription.pickupTime,
                  status: "scheduled",
                  basePrice: totalBasePrice,
                  finalPrice: totalFinalPrice,
                  adjustmentValue: totalFinalPrice - totalBasePrice,
                  adjustmentPercentage:
                    totalBasePrice > 0
                      ? ((totalFinalPrice - totalBasePrice) / totalBasePrice) * 100
                      : 0,
                })
                .returning()

              const newSchedulingPetsValues = configPets.map(sp => ({
                schedulingId: newScheduling.id,
                petId: sp.scheduling_pets.petId,
                packagePriceId: currentSubscriptions.find(
                  sub => sub.petId === sp.scheduling_pets.petId
                )?.packagePriceId,
              }))

              await tx.insert(schedulingPets).values(newSchedulingPetsValues)

              await tx.delete(schedulingPets).where(
                inArray(
                  schedulingPets.id,
                  configPets.map(sp => sp.scheduling_pets.id)
                )
              )
            }

            const remainingPets = await tx.query.schedulingPets.findMany({
              where: eq(schedulingPets.schedulingId, spGroupKey),
            })

            if (remainingPets.length === 0) {
              await tx.delete(schedulings).where(eq(schedulings.id, spGroupKey))
            } else {
              const remainingSubscriptions = await tx.query.clientSubscriptions.findMany({
                where: and(
                  eq(clientSubscriptions.clientId, clientId),
                  inArray(
                    clientSubscriptions.petId,
                    remainingPets.map(rp => rp.petId)
                  ),
                  eq(clientSubscriptions.isActive, true)
                ),
              })

              const newBasePrice = remainingSubscriptions.reduce(
                (sum, sub) => sum + sub.basePrice,
                0
              )
              const newFinalPrice = remainingSubscriptions.reduce(
                (sum, sub) => sum + sub.finalPrice,
                0
              )

              await tx
                .update(schedulings)
                .set({
                  basePrice: newBasePrice,
                  finalPrice: newFinalPrice,
                  adjustmentValue: newFinalPrice - newBasePrice,
                  adjustmentPercentage:
                    newBasePrice > 0 ? ((newFinalPrice - newBasePrice) / newBasePrice) * 100 : 0,
                })
                .where(eq(schedulings.id, spGroupKey))
            }
          }
        }
      }

      const allActiveSubscriptions = await tx.query.clientSubscriptions.findMany({
        where: and(
          eq(clientSubscriptions.clientId, clientId),
          inArray(
            clientSubscriptions.petId,
            petsResult.map(p => p.id)
          ),
          eq(clientSubscriptions.isActive, true)
        ),
        with: {
          packagePrice: true,
        },
      })

      if (allActiveSubscriptions.length > 1) {
        const subscriptionsByConfig = allActiveSubscriptions.reduce((acc, sub) => {
          const configKey = `${sub.pickupDayOfWeek}-${sub.packagePrice.recurrence}`

          if (!acc[configKey]) {
            acc[configKey] = []
          }

          acc[configKey].push(sub)
          return acc
        }, {} as Record<string, typeof allActiveSubscriptions>)

        for (const configKey in subscriptionsByConfig) {
          const subsForConfig = subscriptionsByConfig[configKey]

          if (subsForConfig.length > 1) {
            const separateSchedulings = await tx
              .select()
              .from(schedulingPets)
              .innerJoin(schedulings, eq(schedulingPets.schedulingId, schedulings.id))
              .where(
                and(
                  inArray(
                    schedulingPets.petId,
                    subsForConfig.map(s => s.petId)
                  ),
                  eq(schedulings.clientId, clientId),
                  eq(schedulings.status, "scheduled"),
                  gte(schedulings.pickupDate, Date.now())
                )
              )

            const schedulingGroups = separateSchedulings.reduce((acc, sp) => {
              const schedulingId = sp.schedulings.id
              if (!acc[schedulingId]) {
                acc[schedulingId] = {
                  scheduling: sp.schedulings,
                  pets: [],
                }
              }
              acc[schedulingId].pets.push(sp)
              return acc
            }, {} as Record<string, { scheduling: any; pets: typeof separateSchedulings }>)

            const schedulingIds = Object.keys(schedulingGroups)

            if (schedulingIds.length > 1) {
              const baseSchedulingId = schedulingIds.reduce((earliest, current) => {
                const earliestDate = schedulingGroups[earliest].scheduling.pickupDate
                const currentDate = schedulingGroups[current].scheduling.pickupDate
                return currentDate < earliestDate ? current : earliest
              })

              const baseScheduling = schedulingGroups[baseSchedulingId]
              const otherSchedulings = schedulingIds.filter(id => id !== baseSchedulingId)

              const totalBasePrice = subsForConfig.reduce((sum, sub) => sum + sub.basePrice, 0)
              const totalFinalPrice = subsForConfig.reduce((sum, sub) => sum + sub.finalPrice, 0)

              await tx
                .update(schedulings)
                .set({
                  basePrice: totalBasePrice,
                  finalPrice: totalFinalPrice,
                  adjustmentValue: totalFinalPrice - totalBasePrice,
                  adjustmentPercentage:
                    totalBasePrice > 0
                      ? ((totalFinalPrice - totalBasePrice) / totalBasePrice) * 100
                      : 0,
                })
                .where(eq(schedulings.id, baseSchedulingId))

              for (const otherSchedulingId of otherSchedulings) {
                const otherPets = schedulingGroups[otherSchedulingId].pets

                for (const otherPet of otherPets) {
                  await tx
                    .update(schedulingPets)
                    .set({
                      schedulingId: baseSchedulingId,
                      packagePriceId: subsForConfig.find(
                        s => s.petId === otherPet.scheduling_pets.petId
                      )?.packagePriceId,
                    })
                    .where(eq(schedulingPets.id, otherPet.scheduling_pets.id))
                }

                await tx.delete(schedulings).where(eq(schedulings.id, otherSchedulingId))
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
