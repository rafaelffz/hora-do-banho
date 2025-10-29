import { db } from "~~/server/database"
import {
  InsertPackageWithPrices,
  insertPackageWithPricesSchema,
  packagePrices,
  packages,
} from "~~/server/database/schema"
import { sendZodError } from "~~/server/utils/sendZodError"

export default defineAuthenticatedEventHandler(async event => {
  const result = await readValidatedBody(event, insertPackageWithPricesSchema.safeParse)

  if (!result.success) {
    return sendZodError(event, result.error)
  }

  const session = await getUserSession(event)

  let response = {} as InsertPackageWithPrices

  try {
    await db.transaction(async tx => {
      const [package_] = await tx
        .insert(packages)
        .values({
          userId: session.user.id,
          name: result.data.name,
          duration: result.data.duration,
          description: result.data.description || "",
        })
        .returning({
          id: packages.id,
          userId: packages.userId,
          name: packages.name,
          description: packages.description,
          duration: packages.duration,
        })

      response = { ...package_, pricesByRecurrence: [] }

      const packagePricesResult = await tx
        .insert(packagePrices)
        .values(
          result.data.pricesByRecurrence.map(price => ({
            packageId: package_.id,
            recurrence: price.recurrence,
            price: price.price,
          }))
        )
        .returning({
          id: packagePrices.id,
          packageId: packagePrices.packageId,
          recurrence: packagePrices.recurrence,
          price: packagePrices.price,
          isActive: packagePrices.isActive,
        })

      response.pricesByRecurrence = packagePricesResult
    })

    return response
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: "Unknown error",
      data: error,
    })
  }
})
