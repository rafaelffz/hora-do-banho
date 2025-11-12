import { eq } from "drizzle-orm"
import { db } from "~~/server/database"
import { schedulings, updateSchedulingSchema } from "~~/server/database/schema"

export default defineAuthenticatedEventHandler(async event => {
  const schedulingId = getRouterParam(event, "id")

  if (!schedulingId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Scheduling id is required!",
    })
  }

  const result = await readValidatedBody(event, updateSchedulingSchema.safeParse)

  if (!result.success) {
    return sendZodError(event, result.error)
  }

  const session = await getUserSession(event)

  try {
    const existingScheduling = await db.query.schedulings.findFirst({
      where: eq(schedulings.id, schedulingId),
      with: {
        client: true,
      },
    })

    if (!existingScheduling) {
      throw createError({
        statusCode: 404,
        statusMessage: "Scheduling not found",
      })
    }

    if (existingScheduling.client?.userId !== session.user.id) {
      throw createError({
        statusCode: 403,
        statusMessage: "You do not have permission to edit this scheduling",
      })
    }

    const [updateScheduling] = await db
      .update(schedulings)
      .set({
        ...result.data,
        finalPrice: existingScheduling.finalPrice + (result.data.adjustmentValue || 0),
      })
      .where(eq(schedulings.id, schedulingId))
      .returning()

    return updateScheduling
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
