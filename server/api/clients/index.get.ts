import { eq, desc } from "drizzle-orm"
import { db } from "~~/server/database"
import { clients, packagePrices, packages } from "~~/server/database/schema"

export default defineAuthenticatedEventHandler(async event => {
  const session = await getUserSession(event)

  try {
    const userClients = await db
      .select({
        id: clients.id,
        name: clients.name,
        email: clients.email,
        phone: clients.phone,
        isActive: clients.isActive,
        packagePriceId: clients.packagePriceId,
        packageName: packages.name,
        recurrence: packagePrices.recurrence,
        price: packagePrices.price,
        createdAt: clients.createdAt,
      })
      .from(clients)
      .leftJoin(packagePrices, eq(clients.packagePriceId, packagePrices.id))
      .leftJoin(packages, eq(packagePrices.packageId, packages.id))
      .where(eq(clients.userId, session.user.id))
      .orderBy(desc(clients.createdAt))

    return userClients
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: "Unknown error",
    })
  }
})
