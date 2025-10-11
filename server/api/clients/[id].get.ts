import { eq, and } from "drizzle-orm"
import { db } from "~~/server/database"
import { clients } from "~~/server/database/schema"

export default defineAuthenticatedEventHandler(async event => {
  const session = await getUserSession(event)
  const clientId = getRouterParam(event, "id") as string

  try {
    const client = await db
      .select()
      .from(clients)
      .where(and(eq(clients.userId, session.user.id), eq(clients.id, clientId)))
      .get()

    return client
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: "Unknown error",
    })
  }
})
