import { eq, desc } from "drizzle-orm"
import { db } from "~~/server/database"
import { clients } from "~~/server/database/schema"

export default defineAuthenticatedEventHandler(async event => {
  const session = await getUserSession(event)

  try {
    const userClients = await db
      .select()
      .from(clients)
      .where(eq(clients.userId, session.user.id))
      .orderBy(desc(clients.createdAt))

    return userClients
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: "Unknown error",
    })
  }
})
