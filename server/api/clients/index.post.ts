import { db } from "~~/server/database"
import { clients, insertClientSchema } from "~~/server/database/schema"
import { sendZodError } from "~~/server/utils/sendZodError"

export default defineAuthenticatedEventHandler(async event => {
  const result = await readValidatedBody(event, insertClientSchema.safeParse)

  if (!result.success) {
    return sendZodError(event, result.error)
  }

  const session = await getUserSession(event)

  try {
    const [client] = await db
      .insert(clients)
      .values({
        id: result.data.id,
        userId: session.user.id,
        name: result.data.name,
        email: result.data.email || null,
        phone: result.data.phone || null,
        address: result.data.address || null,
        notes: result.data.notes || null,
      })
      .returning()

    return client
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: "Unknown error",
      data: error,
    })
  }
})
