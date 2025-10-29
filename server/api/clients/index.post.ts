import { db } from "~~/server/database"
import { clients, insertClientWithPetsSchema, pets } from "~~/server/database/schema"
import { sendZodError } from "~~/server/utils/sendZodError"

export default defineAuthenticatedEventHandler(async event => {
  const result = await readValidatedBody(event, insertClientWithPetsSchema.safeParse)

  if (!result.success) {
    return sendZodError(event, result.error)
  }

  const session = await getUserSession(event)

  try {
    await db.transaction(async tx => {
      const [client] = await tx
        .insert(clients)
        .values({
          userId: session.user.id,
          packagePriceId: result.data.packagePriceId,
          name: result.data.name,
          email: result.data.email || null,
          phone: result.data.phone || null,
          address: result.data.address || null,
          notes: result.data.notes || null,
        })
        .returning()

      let petsResponse = null

      if (result.data.pets?.length && client?.id) {
        petsResponse = await tx
          .insert(pets)
          .values(
            result.data.pets.map(pet => ({
              ...pet,
              clientId: client.id,
            }))
          )
          .returning()
      }

      return { client, pets: petsResponse || [] }
    })
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: "Unknown error",
      data: error,
    })
  }
})
