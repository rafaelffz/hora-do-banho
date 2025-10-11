import { eq } from "drizzle-orm"
import { db } from "../../database"
import { clients, schedulings } from "../../database/schema"
import { defineAuthenticatedEventHandler } from "~~/server/utils/defineAuthenticatedEventHandler"

export default defineAuthenticatedEventHandler(async event => {
  const session = await getUserSession(event)

  const result = await db
    .select()
    .from(schedulings)
    .innerJoin(clients, eq(schedulings.clientId, clients.id))
    .where(eq(clients.userId, session.user.id))

  return result
})
