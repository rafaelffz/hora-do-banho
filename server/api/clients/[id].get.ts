import { and, eq } from "drizzle-orm"
import { db } from "~~/server/database"
import { clients } from "~~/server/database/schema"

export default defineAuthenticatedEventHandler(async event => {
  const session = await getUserSession(event)
  const clientId = getRouterParam(event, "id") as string

  try {
    const client = await db.query.clients.findFirst({
      columns: {
        id: true,
        packagePriceId: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        notes: true,
        isActive: true,
      },
      where: and(eq(clients.userId, session.user.id), eq(clients.id, clientId)),
      with: {
        pets: {
          columns: {
            id: true,
            name: true,
            breed: true,
            size: true,
            weight: true,
            notes: true,
          },
          orderBy(fields, operators) {
            return operators.desc(fields.createdAt)
          },
        },
      },
    })

    return client
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: "Unknown error",
    })
  }
})
