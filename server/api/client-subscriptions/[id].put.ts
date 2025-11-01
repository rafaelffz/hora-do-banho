import { and, eq } from "drizzle-orm"
import { db } from "~~/server/database"
import {
  clientSubscriptions,
  updateClientSubscriptionSchema,
  clients,
  pets,
  packagePrices,
  calculateNextPickupDate
} from "~~/server/database/schema"
import { sendZodError } from "~~/server/utils/sendZodError"

export default defineAuthenticatedEventHandler(async event => {
  const subscriptionId = getRouterParam(event, "id") as string

  if (!subscriptionId) {
    throw createError({
      statusCode: 400,
      statusMessage: "ID da subscription é obrigatório"
    })
  }

  const result = await readValidatedBody(event, updateClientSubscriptionSchema.safeParse)

  if (!result.success) {
    return sendZodError(event, result.error)
  }

  const session = await getUserSession(event)

  try {
    // Verificar se a subscription existe e pertence ao usuário
    const existingSubscription = await db
      .select({
        id: clientSubscriptions.id,
        clientId: clientSubscriptions.clientId,
        packagePriceId: clientSubscriptions.packagePriceId,
        startDate: clientSubscriptions.startDate,
        pickupDayOfWeek: clientSubscriptions.pickupDayOfWeek,
      })
      .from(clientSubscriptions)
      .innerJoin(clients, eq(clientSubscriptions.clientId, clients.id))
      .where(and(
        eq(clientSubscriptions.id, subscriptionId),
        eq(clients.userId, session.user.id)
      ))
      .limit(1)

    if (!existingSubscription.length) {
      throw createError({
        statusCode: 404,
        statusMessage: "Subscription não encontrada"
      })
    }

    const subscription = existingSubscription[0]

    // Se mudou pet, verificar se pertence ao cliente
    if (result.data.petId) {
      const pet = await db.query.pets.findFirst({
        where: and(
          eq(pets.id, result.data.petId),
          eq(pets.clientId, subscription.clientId)
        )
      })

      if (!pet) {
        throw createError({
          statusCode: 404,
          statusMessage: "Pet não encontrado"
        })
      }
    }

    // Preparar dados para atualização
    const updateData: any = {}

    // Campos que podem ser atualizados diretamente
    const directFields = [
      'petId', 'pickupTime', 'basePrice', 'finalPrice',
      'adjustmentValue', 'adjustmentPercentage', 'adjustmentReason',
      'endDate', 'isActive', 'notes'
    ]

    directFields.forEach(field => {
      if (result.data[field as keyof typeof result.data] !== undefined) {
        updateData[field] = result.data[field as keyof typeof result.data] === ""
          ? null
          : result.data[field as keyof typeof result.data]
      }
    })

    // Se mudou packagePriceId, startDate ou pickupDayOfWeek, recalcular nextPickupDate
    let needsRecalculation = false
    let newPackagePriceId = subscription.packagePriceId
    let newStartDate = subscription.startDate
    let newPickupDayOfWeek = subscription.pickupDayOfWeek

    if (result.data.packagePriceId !== undefined) {
      updateData.packagePriceId = result.data.packagePriceId
      newPackagePriceId = result.data.packagePriceId
      needsRecalculation = true
    }

    if (result.data.startDate !== undefined) {
      updateData.startDate = result.data.startDate
      newStartDate = result.data.startDate
      needsRecalculation = true
    }

    if (result.data.pickupDayOfWeek !== undefined) {
      updateData.pickupDayOfWeek = result.data.pickupDayOfWeek
      newPickupDayOfWeek = result.data.pickupDayOfWeek
      needsRecalculation = true
    }

    // Recalcular nextPickupDate se necessário
    if (needsRecalculation) {
      const packagePrice = await db.query.packagePrices.findFirst({
        where: eq(packagePrices.id, newPackagePriceId)
      })

      if (!packagePrice) {
        throw createError({
          statusCode: 404,
          statusMessage: "Preço do pacote não encontrado"
        })
      }

      updateData.nextPickupDate = calculateNextPickupDate(
        newStartDate,
        packagePrice.recurrence,
        newPickupDayOfWeek
      )
    }

    // Atualizar apenas se há dados para atualizar
    if (Object.keys(updateData).length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: "Nenhum dado para atualizar"
      })
    }

    const [updatedSubscription] = await db
      .update(clientSubscriptions)
      .set(updateData)
      .where(eq(clientSubscriptions.id, subscriptionId))
      .returning()

    return updatedSubscription
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
