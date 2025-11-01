import { and, eq } from "drizzle-orm"
import { db } from "~~/server/database"
import { packagePrices, packages } from "~~/server/database/schema"

export default defineAuthenticatedEventHandler(async event => {
  const id = getRouterParam(event, "id") as string

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Package price id is required!",
    })
  }

  const session = await getUserSession(event)

  try {
    const [userPackage] = await db
      .select({
        id: packages.id,
      })
      .from(packages)
      .innerJoin(
        packagePrices,
        and(eq(packages.id, packagePrices.packageId), eq(packages.userId, session.user.id))
      )

    if (!userPackage) {
      throw createError({
        statusCode: 404,
        statusMessage: "You don't have permission to delete this package price",
      })
    }

    const [removed] = await db
      .delete(packagePrices)
      .where(and(eq(packagePrices.id, id)))
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
