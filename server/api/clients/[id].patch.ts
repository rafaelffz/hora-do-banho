import { db } from "~~/server/database"
import { clients, updateClientSchema } from "~~/server/database/schema"
import { sendZodError } from "~~/server/utils/sendZodError"
import { eq } from "drizzle-orm"

export default defineAuthenticatedEventHandler(async event => {
  const clientId = getRouterParam(event, "id")

  if (!clientId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Client id is required!",
    })
  }

  const result = await readValidatedBody(event, updateClientSchema.safeParse)

  if (!result.success) {
    return sendZodError(event, result.error)
  }

  const session = await getUserSession(event)

  try {
    const existingClient = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1)

    if (existingClient.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: "Client not found",
      })
    }

    if (existingClient[0].userId !== session.user.id) {
      throw createError({
        statusCode: 403,
        statusMessage: "You do not have permission to edit this client",
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

    const [updatedClient] = await db
      .update(clients)
      .set({ ...updateData, id: clientId })
      .where(eq(clients.id, clientId))
      .returning()

    return updatedClient
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
