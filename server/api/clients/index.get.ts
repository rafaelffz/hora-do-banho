import { eq, desc, sql, count } from "drizzle-orm"
import { db } from "~~/server/database"
import { clients, clientSubscriptions } from "~~/server/database/schema"

export default defineAuthenticatedEventHandler(async event => {
  const session = await getUserSession(event)

  try {
    const userClients = await db
      .select({
        id: clients.id,
        name: clients.name,
        email: clients.email,
        phone: clients.phone,
        address: clients.address,
        notes: clients.notes,
        createdAt: clients.createdAt,
        activeSubscriptionsCount: count(clientSubscriptions.id),
      })
      .from(clients)
      .leftJoin(clientSubscriptions, eq(clients.id, clientSubscriptions.clientId))
      .where(eq(clients.userId, session.user.id))
      .groupBy(clients.id)
      .orderBy(desc(clients.createdAt))

    return userClients
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: "Unknown error",
    })
  }
})
