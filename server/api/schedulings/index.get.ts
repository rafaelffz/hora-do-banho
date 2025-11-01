import { and, desc, eq, gte, lte } from "drizzle-orm"
import { db } from "../../database"
import { clients, schedulings, packages, pets, schedulingPets } from "../../database/schema"
import { defineAuthenticatedEventHandler } from "~~/server/utils/defineAuthenticatedEventHandler"

export default defineAuthenticatedEventHandler(async event => {
  const session = await getUserSession(event)
  const query = getQuery(event)

  const { startDate, endDate, next30Days } = query

  let conditions = [eq(clients.userId, session.user.id)]

  // Se next30Days for true, buscar apenas os próximos 30 dias
  if (next30Days === "true") {
    const now = Date.now()
    const thirtyDaysFromNow = now + 30 * 24 * 60 * 60 * 1000
    conditions.push(gte(schedulings.schedulingDate, now))
    conditions.push(lte(schedulings.schedulingDate, thirtyDaysFromNow))
  } else {
    // Filtros de data personalizados
    if (startDate) {
      conditions.push(gte(schedulings.schedulingDate, parseInt(startDate as string)))
    }
    if (endDate) {
      conditions.push(lte(schedulings.schedulingDate, parseInt(endDate as string)))
    }
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
      package: {
        id: packages.id,
        name: packages.name,
        description: packages.description,
      },
    })
    .from(schedulings)
    .innerJoin(clients, eq(schedulings.clientId, clients.id))
    .leftJoin(packages, eq(schedulings.packageId, packages.id))
    .where(and(...conditions))
    .orderBy(desc(schedulings.schedulingDate))

  // Buscar os pets para cada agendamento
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
