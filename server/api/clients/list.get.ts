import { eq } from "drizzle-orm"
import { db } from "~~/server/database"
import { clients } from "~~/server/database/schema"

export default defineAuthenticatedEventHandler(async event => {
  const session = await getUserSession(event)
  const query = getQuery(event)

  if (query.withPets) {
    return await db.query.clients.findMany({
      columns: {
        id: true,
        name: true,
      },
      where: eq(clients.userId, session.user.id),
      with: {
        pets: {
          columns: {
            id: true,
            name: true,
          },
        },
      },
    })
  }

  return await db.query.clients.findMany({
    columns: {
      id: true,
      name: true,
    },
    where: eq(clients.userId, session.user.id),
  })
})
