import { eq, desc, and } from "drizzle-orm"
import { db } from "~~/server/database"
import { clientSubscriptions, clients, pets, packagePrices, packages } from "~~/server/database/schema"

export default defineAuthenticatedEventHandler(async event => {
  const session = await getUserSession(event)

  try {
    const subscriptions = await db
      .select({
        id: clientSubscriptions.id,
        clientId: clientSubscriptions.clientId,
        clientName: clients.name,
        petId: clientSubscriptions.petId,
        petName: pets.name,
        packagePriceId: clientSubscriptions.packagePriceId,
        packageName: packages.name,
        recurrence: packagePrices.recurrence,
        price: packagePrices.price,
        pickupDayOfWeek: clientSubscriptions.pickupDayOfWeek,
        pickupTime: clientSubscriptions.pickupTime,
        nextPickupDate: clientSubscriptions.nextPickupDate,
        finalPrice: clientSubscriptions.finalPrice,
        adjustmentValue: clientSubscriptions.adjustmentValue,
        adjustmentPercentage: clientSubscriptions.adjustmentPercentage,
        adjustmentReason: clientSubscriptions.adjustmentReason,
        startDate: clientSubscriptions.startDate,
        endDate: clientSubscriptions.endDate,
        isActive: clientSubscriptions.isActive,
        notes: clientSubscriptions.notes,
        createdAt: clientSubscriptions.createdAt,
      })
      .from(clientSubscriptions)
      .innerJoin(clients, eq(clientSubscriptions.clientId, clients.id))
      .innerJoin(pets, eq(clientSubscriptions.petId, pets.id))
      .innerJoin(packagePrices, eq(clientSubscriptions.packagePriceId, packagePrices.id))
      .innerJoin(packages, eq(packagePrices.packageId, packages.id))
      .where(and(
        eq(clients.userId, session.user.id),
        eq(clientSubscriptions.isActive, true)
      ))
      .orderBy(desc(clientSubscriptions.nextPickupDate))

    return subscriptions
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: "Unknown error",
      data: error,
    })
  }
})
