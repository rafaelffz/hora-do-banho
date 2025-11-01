import { and, eq } from "drizzle-orm"
import { db } from "~~/server/database"
import { clientSubscriptions, clients, pets, packagePrices, packages } from "~~/server/database/schema"

export default defineAuthenticatedEventHandler(async event => {
  const session = await getUserSession(event)
  const clientId = getRouterParam(event, "id") as string

  if (!clientId) {
    throw createError({
      statusCode: 400,
      statusMessage: "ID do cliente é obrigatório"
    })
  }

  try {
    // Verificar se o cliente pertence ao usuário
    const client = await db.query.clients.findFirst({
      where: and(
        eq(clients.id, clientId),
        eq(clients.userId, session.user.id)
      )
    })

    if (!client) {
      throw createError({
        statusCode: 404,
        statusMessage: "Cliente não encontrado"
      })
    }

    // Buscar todas as subscriptions do cliente (ativas e inativas)
    const subscriptions = await db
      .select({
        id: clientSubscriptions.id,
        petId: clientSubscriptions.petId,
        petName: pets.name,
        petBreed: pets.breed,
        petSize: pets.size,
        packagePriceId: clientSubscriptions.packagePriceId,
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
      .innerJoin(pets, eq(clientSubscriptions.petId, pets.id))
      .innerJoin(packagePrices, eq(clientSubscriptions.packagePriceId, packagePrices.id))
      .innerJoin(packages, eq(packagePrices.packageId, packages.id))
      .where(eq(clientSubscriptions.clientId, clientId))
      .orderBy(clientSubscriptions.isActive, clientSubscriptions.nextPickupDate)

    return subscriptions
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
