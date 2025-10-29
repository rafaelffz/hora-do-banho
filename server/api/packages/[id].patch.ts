import { and, eq } from "drizzle-orm"
import { db } from "~~/server/database"
import {
  packagePrices,
  packages,
  UpdatePackageWithPrices,
  updatePackageWithPricesSchema,
} from "~~/server/database/schema"
import { sendZodError } from "~~/server/utils/sendZodError"

export default defineAuthenticatedEventHandler(async event => {
  const packageId = getRouterParam(event, "id")

  if (!packageId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Package id is required!",
    })
  }

  const result = await readValidatedBody(event, updatePackageWithPricesSchema.safeParse)

  if (!result.success) {
    return sendZodError(event, result.error)
  }

  const session = await getUserSession(event)

  try {
    let response = {} as UpdatePackageWithPrices

    const existingPackage = await db
      .select()
      .from(packages)
      .where(eq(packages.id, packageId))
      .limit(1)

    if (existingPackage.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: "Package not found",
      })
    }

    if (existingPackage[0].userId !== session.user.id) {
      throw createError({
        statusCode: 403,
        statusMessage: "You do not have permission to edit this package",
      })
    }

    await db.transaction(async tx => {
      const { pricesByRecurrence, ...packageData } = result.data

      const updateData = Object.fromEntries(
        Object.entries(packageData).map(([key, value]) => [key, value === "" ? null : value])
      )

      if (
        Object.keys(updateData).length === 0 &&
        (!pricesByRecurrence || pricesByRecurrence.length === 0)
      ) {
        throw createError({
          statusCode: 400,
          statusMessage: "No data to update",
        })
      }

      const [updatedPackage] = await tx
        .update(packages)
        .set({ ...updateData, id: packageId })
        .where(eq(packages.id, packageId))
        .returning()

      response = { ...updatedPackage, pricesByRecurrence: [] }

      for (const price of pricesByRecurrence) {
        if (price.id) {
          const [updatedPrice] = await tx
            .update(packagePrices)
            .set({
              recurrence: price.recurrence,
              price: price.price,
            })
            .where(and(eq(packagePrices.id, price.id), eq(packagePrices.packageId, packageId)))
            .returning()

          response.pricesByRecurrence.push(updatedPrice)
        } else {
          const [newPrice] = await tx
            .insert(packagePrices)
            .values({
              packageId: packageId,
              recurrence: price.recurrence,
              price: price.price,
            })
            .returning()

          response.pricesByRecurrence.push(newPrice)
        }
      }

      return response
    })
  } catch (error: any) {
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: "Unknown error",
      data: error,
    })
  }
})
