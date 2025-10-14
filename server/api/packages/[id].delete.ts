import { and, eq } from "drizzle-orm"
import { db } from "~~/server/database"
import { packages } from "~~/server/database/schema"

export default defineAuthenticatedEventHandler(async event => {
  const id = getRouterParam(event, "id") as string

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Package id is required!",
    })
  }

  const session = await getUserSession(event)

  try {
    const [removed] = await db
      .delete(packages)
      .where(and(eq(packages.id, id), eq(packages.userId, session.user.id)))
      .returning()

    if (!removed) {
      throw createError({
        statusCode: 404,
        statusMessage: "Package not found",
      })
    }

    return removed
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: "Unknown error",
    })
  }
})
