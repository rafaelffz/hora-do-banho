import { db } from "~~/server/database"
import { clientSubscriptions, insertClientSubscriptionSchema, clients, pets, packagePrices, calculateNextPickupDate } from "~~/server/database/schema"
import { sendZodError } from "~~/server/utils/sendZodError"
import { eq, and } from "drizzle-orm"

export default defineAuthenticatedEventHandler(async event => {
  const result = await readValidatedBody(event, insertClientSubscriptionSchema.safeParse)

  if (!result.success) {
    return sendZodError(event, result.error)
  }

  const session = await getUserSession(event)

  try {
    // Verificar se o cliente pertence ao usuário
    const client = await db.query.clients.findFirst({
      where: and(
        eq(clients.id, result.data.clientId),
        eq(clients.userId, session.user.id)
      )
    })

    if (!client) {
      throw createError({
        statusCode: 404,
        statusMessage: "Cliente não encontrado"
      })
    }

    // Verificar se o pet pertence ao cliente
    const pet = await db.query.pets.findFirst({
      where: and(
        eq(pets.id, result.data.petId),
        eq(pets.clientId, result.data.clientId)
      )
    })

    if (!pet) {
      throw createError({
        statusCode: 404,
        statusMessage: "Pet não encontrado"
      })
    }

    // Buscar informações do packagePrice para calcular nextPickupDate
    const packagePrice = await db.query.packagePrices.findFirst({
      where: eq(packagePrices.id, result.data.packagePriceId)
    })

    if (!packagePrice) {
      throw createError({
        statusCode: 404,
        statusMessage: "Preço do pacote não encontrado"
      })
    }

    // Calcular próxima data de coleta
    const nextPickupDate = calculateNextPickupDate(
      result.data.startDate,
      packagePrice.recurrence,
      result.data.pickupDayOfWeek
    )

    const [subscription] = await db
      .insert(clientSubscriptions)
      .values({
        clientId: result.data.clientId,
        packagePriceId: result.data.packagePriceId,
        petId: result.data.petId,
        pickupDayOfWeek: result.data.pickupDayOfWeek,
        pickupTime: result.data.pickupTime || null,
        nextPickupDate,
        basePrice: result.data.basePrice,
        finalPrice: result.data.finalPrice,
        adjustmentValue: result.data.adjustmentValue || 0,
        adjustmentPercentage: result.data.adjustmentPercentage || 0,
        adjustmentReason: result.data.adjustmentReason || null,
        startDate: result.data.startDate,
        endDate: result.data.endDate || null,
        notes: result.data.notes || null,
      })
      .returning()

    return subscription
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
