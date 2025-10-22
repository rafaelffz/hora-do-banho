import { db } from "~~/server/database"
import { packages, insertPackageSchema } from "~~/server/database/schema"
import { sendZodError } from "~~/server/utils/sendZodError"

export default defineAuthenticatedEventHandler(async event => {
  const result = await readValidatedBody(event, insertPackageSchema.safeParse)

  if (!result.success) {
    return sendZodError(event, result.error)
  }

  const session = await getUserSession(event)

  try {
    const [package_] = await db
      .insert(packages)
      .values({
        userId: session.user.id,
        name: result.data.name,
        description: result.data.description || null,
        price: result.data.price,
        duration: result.data.duration,
        recurrence: result.data.recurrence,
      })
      .returning({
        id: packages.id,
        userId: packages.userId,
        name: packages.name,
        description: packages.description,
        price: packages.price,
        duration: packages.duration,
        recurrence: packages.recurrence,
      })

    return package_
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: "Unknown error",
      data: error,
    })
  }
})
