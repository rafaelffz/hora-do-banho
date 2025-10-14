import { eq, and } from "drizzle-orm"
import { db } from "~~/server/database"
import { packages } from "~~/server/database/schema"

export default defineAuthenticatedEventHandler(async event => {
  const session = await getUserSession(event)
  const packageId = getRouterParam(event, "id") as string

  try {
    const package_ = await db
      .select()
      .from(packages)
      .where(and(eq(packages.userId, session.user.id), eq(packages.id, packageId)))
      .get()

    return package_
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: "Unknown error",
    })
  }
})
