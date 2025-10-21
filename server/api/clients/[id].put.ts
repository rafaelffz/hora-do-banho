import { db } from "~~/server/database"
import { clients, updateClientWithPetsSchema } from "~~/server/database/schema"
import { pets, type UpdatePet } from "~~/server/database/schema/pets"
import { sendZodError } from "~~/server/utils/sendZodError"
import { eq, inArray } from "drizzle-orm"

export default defineAuthenticatedEventHandler(async event => {
  const clientId = getRouterParam(event, "id")

  if (!clientId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Client id is required!",
    })
  }

  const result = await readValidatedBody(event, updateClientWithPetsSchema.safeParse)

  if (!result.success) {
    return sendZodError(event, result.error)
  }

  const session = await getUserSession(event)

  try {
    const existingClient = await db.query.clients.findFirst({
      where: eq(clients.id, clientId),
      with: {
        pets: {
          columns: {
            id: true,
            name: true,
            breed: true,
            size: true,
            weight: true,
            notes: true,
            clientId: true,
          },
        },
      },
    })

    if (!existingClient) {
      throw createError({
        statusCode: 404,
        statusMessage: "Client not found",
      })
    }

    if (existingClient.userId !== session.user.id) {
      throw createError({
        statusCode: 403,
        statusMessage: "You do not have permission to edit this client",
      })
    }

    const updateData = Object.fromEntries(
      Object.entries(result.data)
        .filter(([key]) => key !== "pets")
        .map(([key, value]) => [key, value === "" ? null : value])
    )

    if (Object.keys(updateData).length === 0 && !result.data.pets) {
      throw createError({
        statusCode: 400,
        statusMessage: "No data to update",
      })
    }

    const [updatedClient] = await db
      .update(clients)
      .set({ ...updateData, id: clientId })
      .where(eq(clients.id, clientId))
      .returning({
        id: clients.id,
        name: clients.name,
        email: clients.email,
        avatar: clients.avatar,
        phone: clients.phone,
        address: clients.address,
        notes: clients.notes,
        isActive: clients.isActive,
      })

    let petsResult: UpdatePet[] = []

    if (result.data.pets?.length) {
      const existingPets = result.data.pets.filter(pet => pet.id && pet.id.trim() !== "")
      const newPets = result.data.pets.filter(pet => !pet.id || pet.id.trim() === "")

      const existingPetIds = existingPets.map(pet => pet.id)
      const currentPetIds = existingClient.pets.map(pet => pet.id)

      const petsToDelete = currentPetIds.filter(id => !existingPetIds.includes(id))
      if (petsToDelete.length > 0) {
        await db.delete(pets).where(inArray(pets.id, petsToDelete))
      }

      for (const pet of existingPets) {
        if (pet.name && pet.id) {
          const [updatedPet] = await db
            .update(pets)
            .set({
              name: pet.name,
              breed: pet.breed || null,
              size: pet.size || null,
              weight: pet.weight || null,
              notes: pet.notes || null,
            })
            .where(eq(pets.id, pet.id))
            .returning({
              id: pets.id,
              name: pets.name,
              breed: pets.breed,
              size: pets.size,
              weight: pets.weight,
              notes: pets.notes,
              clientId: pets.clientId,
            })

          if (updatedPet) {
            petsResult.push(updatedPet)
          }
        }
      }

      if (newPets.length > 0) {
        const petsToInsert = newPets
          .filter(pet => pet.name)
          .map(pet => ({
            name: pet.name!,
            clientId,
            breed: pet.breed || null,
            size: pet.size || null,
            weight: pet.weight || null,
            notes: pet.notes || null,
          }))

        if (petsToInsert.length > 0) {
          const insertedPets = await db.insert(pets).values(petsToInsert).returning({
            id: pets.id,
            name: pets.name,
            breed: pets.breed,
            size: pets.size,
            weight: pets.weight,
            notes: pets.notes,
            clientId: pets.clientId,
          })

          petsResult.push(...insertedPets)
        }
      }
    }

    return { ...updatedClient, pets: petsResult }
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
