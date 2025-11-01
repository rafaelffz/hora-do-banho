import { and, eq } from "drizzle-orm"
import { db } from "~~/server/database"
import { clients } from "~~/server/database/schema"

export default defineAuthenticatedEventHandler(async event => {
  const session = await getUserSession(event)
  const clientId = getRouterParam(event, "id") as string

  try {
    const client = await db.query.clients.findFirst({
      columns: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        notes: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
      },
      where: and(eq(clients.userId, session.user.id), eq(clients.id, clientId)),
      with: {
        pets: {
          columns: {
            id: true,
            name: true,
            breed: true,
            size: true,
            weight: true,
            notes: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy(fields, operators) {
            return operators.desc(fields.createdAt)
          },
        },
        subscriptions: {
          columns: {
            id: true,
            packagePriceId: true,
            petId: true,
            pickupDayOfWeek: true,
            pickupTime: true,
            nextPickupDate: true,
            basePrice: true,
            finalPrice: true,
            adjustmentValue: true,
            adjustmentPercentage: true,
            adjustmentReason: true,
            startDate: true,
            endDate: true,
            isActive: true,
            notes: true,
          },
          where(fields, operators) {
            return operators.eq(fields.isActive, true)
          },
          with: {
            packagePrice: {
              columns: {
                id: true,
                recurrence: true,
                price: true,
              },
              with: {
                package: {
                  columns: {
                    id: true,
                    name: true,
                    description: true,
                    duration: true,
                  },
                },
              },
            },
            pet: {
              columns: {
                id: true,
                name: true,
              },
            },
          },
          orderBy(fields, operators) {
            return operators.desc(fields.nextPickupDate)
          },
        },
      },
    })

    if (!client) {
      throw createError({
        statusCode: 404,
        statusMessage: "Cliente não encontrado",
      })
    }

    // Organizar pets com suas respectivas subscriptions
    const petsWithSubscriptions = client.pets.map(pet => {
      const petSubscription = client.subscriptions.find(sub => sub.petId === pet.id)
      return {
        ...pet,
        subscription: petSubscription || null,
      }
    })

    return {
      ...client,
      pets: petsWithSubscriptions,
    }
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
