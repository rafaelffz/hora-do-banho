import { db } from "~~/server/database"
import { packages, updatePackageSchema } from "~~/server/database/schema"
import { sendZodError } from "~~/server/utils/sendZodError"
import { eq } from "drizzle-orm"

export default defineAuthenticatedEventHandler(async event => {
  const packageId = getRouterParam(event, "id")

  if (!packageId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Package id is required!",
    })
  }

  const result = await readValidatedBody(event, updatePackageSchema.safeParse)

  if (!result.success) {
    return sendZodError(event, result.error)
  }

  const session = await getUserSession(event)

  try {
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

    const updateData = Object.fromEntries(
      Object.entries(result.data).map(([key, value]) => [key, value === "" ? null : value])
    )

    if (Object.keys(updateData).length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: "No data to update",
      })
    }

    const [updatedPackage] = await db
      .update(packages)
      .set({ ...updateData, id: packageId })
      .where(eq(packages.id, packageId))
      .returning()

    return updatedPackage
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
