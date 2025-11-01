import { and, eq } from "drizzle-orm"
import { db } from "~~/server/database"
import { clientSubscriptions, clients } from "~~/server/database/schema"

export default defineAuthenticatedEventHandler(async event => {
  const subscriptionId = getRouterParam(event, "id") as string

  if (!subscriptionId) {
    throw createError({
      statusCode: 400,
      statusMessage: "ID da subscription é obrigatório"
    })
  }

  const session = await getUserSession(event)

  try {
    // Verificar se a subscription existe e pertence ao usuário
    const existingSubscription = await db
      .select({
        id: clientSubscriptions.id,
        isActive: clientSubscriptions.isActive,
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

    // Soft delete - marcar como inativa
    const [deactivatedSubscription] = await db
      .update(clientSubscriptions)
      .set({
        isActive: false,
        endDate: Date.now()
      })
      .where(eq(clientSubscriptions.id, subscriptionId))
      .returning({
        id: clientSubscriptions.id,
        isActive: clientSubscriptions.isActive,
        endDate: clientSubscriptions.endDate,
      })

    return deactivatedSubscription
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
