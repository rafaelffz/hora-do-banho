import { eq, inArray } from "drizzle-orm"
import { db } from "~~/server/database"
import { clients, pets, schedulingPets, schedulings } from "~~/server/database/schema"
import { sendZodError } from "~~/server/utils/sendZodError"
import { z } from "zod"

const createSchedulingSchema = z.object({
  clientId: z.string().uuid("Cliente inválido"),
  petIds: z.array(z.string().uuid("Pet inválido")).min(1, "Pelo menos um pet deve ser selecionado"),
  pickupDate: z.number().min(1, "Data do agendamento é obrigatória"),
  pickupTime: z.string().optional().nullable(),
  basePrice: z.number().min(0, "Preço base deve ser maior que zero"),
  finalPrice: z.number().min(0, "Preço total deve ser maior que zero"),
  adjustmentValue: z.number().default(0),
  adjustmentPercentage: z.number().default(0),
  adjustmentReason: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export default defineAuthenticatedEventHandler(async event => {
  const session = await getUserSession(event)

  const result = await readValidatedBody(event, createSchedulingSchema.safeParse)

  if (!result.success) {
    return sendZodError(event, result.error)
  }

  const data = result.data

  try {
    const client = await db.query.clients.findFirst({
      where: eq(clients.id, data.clientId),
    })

    if (!client) {
      throw createError({
        statusCode: 404,
        statusMessage: "Cliente não encontrado",
      })
    }

    if (client.userId !== session.user.id) {
      throw createError({
        statusCode: 403,
        statusMessage: "Você não tem permissão para agendar para este cliente",
      })
    }

    const clientPets = await db.query.pets.findMany({
      where: eq(pets.clientId, data.clientId),
    })

    const clientPetIds = clientPets.map(p => p.id)
    const invalidPetIds = data.petIds.filter(petId => !clientPetIds.includes(petId))

    if (invalidPetIds.length > 0) {
      throw createError({
        statusCode: 400,
        statusMessage: "Alguns pets não pertencem a este cliente",
      })
    }

    const response = await db.transaction(async tx => {
      const [newScheduling] = await tx
        .insert(schedulings)
        .values({
          clientId: data.clientId,
          pickupDate: data.pickupDate,
          pickupTime: data.pickupTime,
          status: "scheduled",
          basePrice: data.basePrice,
          finalPrice: data.finalPrice,
          adjustmentValue: data.adjustmentValue,
          adjustmentPercentage: data.adjustmentPercentage,
          adjustmentReason: data.adjustmentReason,
          notes: data.notes,
        })
        .returning()

      const schedulingPetsValues = data.petIds.map(petId => ({
        schedulingId: newScheduling.id,
        petId,
        packagePriceId: null,
      }))

      await tx.insert(schedulingPets).values(schedulingPetsValues)

      const schedulingWithDetails = await tx.query.schedulings.findFirst({
        where: eq(schedulings.id, newScheduling.id),
        with: {
          client: {
            columns: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          schedulingPets: {
            with: {
              pet: {
                columns: {
                  id: true,
                  name: true,
                  breed: true,
                  size: true,
                },
              },
            },
          },
        },
      })

      return {
        scheduling: newScheduling,
        client: schedulingWithDetails?.client,
        pets: schedulingWithDetails?.schedulingPets.map(sp => sp.pet) || [],
      }
    })

    return response
  } catch (error: any) {
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: "Erro interno do servidor",
      data: error,
    })
  }
})
