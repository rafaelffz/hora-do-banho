import { and, between, desc, eq, gte, lte } from "drizzle-orm"
import { db } from "../../database"
import {
  clients,
  schedulings,
  packages,
  pets,
  schedulingPets,
  packagePrices,
} from "../../database/schema"
import { defineAuthenticatedEventHandler } from "~~/server/utils/defineAuthenticatedEventHandler"

export default defineAuthenticatedEventHandler(async event => {
  const session = await getUserSession(event)
  const query = getQuery(event)

  const { next30Days } = query

  let conditions = [eq(clients.userId, session.user.id)]

  if (next30Days === "true") {
    const now = Date.now()
    const thirtyDaysFromNow = now + 30 * 24 * 60 * 60 * 1000
    conditions.push(between(schedulings.pickupDate, now, thirtyDaysFromNow))
  }

  const result = await db
    .select({
      scheduling: schedulings,
      client: {
        id: clients.id,
        name: clients.name,
        email: clients.email,
        phone: clients.phone,
      },
    })
    .from(schedulings)
    .innerJoin(clients, eq(schedulings.clientId, clients.id))
    .where(and(...conditions))
    .orderBy(desc(schedulings.pickupDate))

  const schedulingsWithPets = await Promise.all(
    result.map(async item => {
      const schedulingPetsResult = await db
        .select({
          pet: {
            id: pets.id,
            name: pets.name,
            breed: pets.breed,
            size: pets.size,
          },
        })
        .from(schedulingPets)
        .innerJoin(pets, eq(schedulingPets.petId, pets.id))
        .where(eq(schedulingPets.schedulingId, item.scheduling.id))

      return {
        ...item,
        pets: schedulingPetsResult.map(p => p.pet),
      }
    })
  )

  return schedulingsWithPets
})
