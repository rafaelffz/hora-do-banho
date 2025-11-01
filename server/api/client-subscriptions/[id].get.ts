import { and, eq } from "drizzle-orm"
import { db } from "~~/server/database"
import { clientSubscriptions, clients, pets, packagePrices, packages } from "~~/server/database/schema"

export default defineAuthenticatedEventHandler(async event => {
  const session = await getUserSession(event)
  const subscriptionId = getRouterParam(event, "id") as string

  if (!subscriptionId) {
    throw createError({
      statusCode: 400,
      statusMessage: "ID da subscription é obrigatório"
    })
  }

  try {
    const subscription = await db
      .select({
        id: clientSubscriptions.id,
        clientId: clientSubscriptions.clientId,
        clientName: clients.name,
        clientEmail: clients.email,
        clientPhone: clients.phone,
        petId: clientSubscriptions.petId,
        petName: pets.name,
        petBreed: pets.breed,
        petSize: pets.size,
        packagePriceId: clientSubscriptions.packagePriceId,
        packageId: packages.id,
        packageName: packages.name,
        packageDescription: packages.description,
        packageDuration: packages.duration,
        recurrence: packagePrices.recurrence,
        price: packagePrices.price,
        pickupDayOfWeek: clientSubscriptions.pickupDayOfWeek,
        pickupTime: clientSubscriptions.pickupTime,
        nextPickupDate: clientSubscriptions.nextPickupDate,
        basePrice: clientSubscriptions.basePrice,
        finalPrice: clientSubscriptions.finalPrice,
        adjustmentValue: clientSubscriptions.adjustmentValue,
        adjustmentPercentage: clientSubscriptions.adjustmentPercentage,
        adjustmentReason: clientSubscriptions.adjustmentReason,
        startDate: clientSubscriptions.startDate,
        endDate: clientSubscriptions.endDate,
        isActive: clientSubscriptions.isActive,
        notes: clientSubscriptions.notes,
        createdAt: clientSubscriptions.createdAt,
        updatedAt: clientSubscriptions.updatedAt,
      })
      .from(clientSubscriptions)
      .innerJoin(clients, eq(clientSubscriptions.clientId, clients.id))
      .innerJoin(pets, eq(clientSubscriptions.petId, pets.id))
      .innerJoin(packagePrices, eq(clientSubscriptions.packagePriceId, packagePrices.id))
      .innerJoin(packages, eq(packagePrices.packageId, packages.id))
      .where(and(
        eq(clientSubscriptions.id, subscriptionId),
        eq(clients.userId, session.user.id)
      ))
      .limit(1)

    if (!subscription.length) {
      throw createError({
        statusCode: 404,
        statusMessage: "Subscription não encontrada"
      })
    }

    return subscription[0]
  } catch (error: any) {
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: "Erro interno do servidor",
      data: error,
    })
  }
})
