import { eq, and } from "drizzle-orm"
import { db } from "~~/server/database"
import { packages } from "~~/server/database/schema"

export default defineAuthenticatedEventHandler(async event => {
  const session = await getUserSession(event)
  const packageId = getRouterParam(event, "id") as string

  try {
    const package_ = await db.query.packages.findFirst({
      columns: {
        id: true,
        userId: true,
        name: true,
        description: true,
        duration: true,
        isActive: true,
      },
      with: {
        pricesByRecurrence: {
          columns: {
            id: true,
            recurrence: true,
            price: true,
          },
        },
      },
      where: and(eq(packages.userId, session.user.id), eq(packages.id, packageId)),
    })

    return package_
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: "Unknown error",
    })
  }
})
