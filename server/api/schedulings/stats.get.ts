import { and, between, count, eq, sum, countDistinct } from "drizzle-orm"
import { db } from "../../database"
import { clients, schedulings, clientSubscriptions } from "../../database/schema"
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

  const [schedulingStats, scheduledCount, completedCount] = await Promise.all([
    db
      .select({
        total: count(),
      })
      .from(schedulings)
      .innerJoin(clients, eq(schedulings.clientId, clients.id))
      .where(and(...conditions)),
    db
      .select({ count: count() })
      .from(schedulings)
      .innerJoin(clients, eq(schedulings.clientId, clients.id))
      .where(and(...conditions, eq(schedulings.status, "scheduled"))),
    db
      .select({ count: count() })
      .from(schedulings)
      .innerJoin(clients, eq(schedulings.clientId, clients.id))
      .where(and(...conditions, eq(schedulings.status, "completed"))),
  ])

  return {
    schedulings: {
      total: schedulingStats[0]?.total || 0,
      scheduled: scheduledCount[0]?.count || 0,
      completed: completedCount[0]?.count || 0,
    },
  }
})
