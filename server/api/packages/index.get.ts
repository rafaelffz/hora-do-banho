import { eq, desc } from "drizzle-orm"
import { db } from "~~/server/database"
import { packages } from "~~/server/database/schema"

export default defineAuthenticatedEventHandler(async event => {
  const session = await getUserSession(event)

  try {
    const userPackages = await db
      .select()
      .from(packages)
      .where(eq(packages.userId, session.user.id))
      .orderBy(desc(packages.createdAt))

    return userPackages
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: "Unknown error",
    })
  }
})
