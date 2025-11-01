import { eq, desc, and } from "drizzle-orm"
import { db } from "~~/server/database"
import { packagePrices, packages } from "~~/server/database/schema"

export default defineAuthenticatedEventHandler(async event => {
  const session = await getUserSession(event)

  try {
    const userPackages = await db
      .select({
        id: packagePrices.id,
        name: packages.name,
        recurrence: packagePrices.recurrence,
        price: packagePrices.price,
      })
      .from(packagePrices)
      .innerJoin(packages, eq(packagePrices.packageId, packages.id))
      .where(and(eq(packages.userId, session.user.id), eq(packages.isActive, true)))
      .orderBy(desc(packages.createdAt))

    return userPackages
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: "Unknown error",
    })
  }
})
