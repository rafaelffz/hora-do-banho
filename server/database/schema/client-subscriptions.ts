import { relations } from "drizzle-orm"
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { createInsertSchema, createSelectSchema } from "drizzle-zod"
import { v7 as uuid } from "uuid"
import z4 from "zod/v4"
import { clients } from "./clients"
import { packagePrices } from "./package-prices"
import { pets } from "./pets"

export const clientSubscriptions = sqliteTable("client_subscriptions", {
  id: text()
    .primaryKey()
    .$default(() => uuid()),
  clientId: text()
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" }),
  packagePriceId: text()
    .notNull()
    .references(() => packagePrices.id, { onDelete: "cascade" }),
  petId: text()
    .notNull()
    .references(() => pets.id, { onDelete: "cascade" }),
  pickupDayOfWeek: integer().notNull(),
  pickupTime: text(),
  nextPickupDate: integer(),
  basePrice: real().notNull(),
  finalPrice: real().notNull(),
  adjustmentValue: real().default(0),
  adjustmentPercentage: real().default(0),
  adjustmentReason: text(),
  startDate: integer().notNull(),
  endDate: integer(),
  isActive: integer({ mode: "boolean" }).notNull().default(true),
  notes: text(),
  createdAt: integer()
    .notNull()
    .$defaultFn(() => Date.now()),
  updatedAt: integer()
    .notNull()
    .$onUpdateFn(() => Date.now()),
})

export const clientSubscriptionsRelations = relations(clientSubscriptions, ({ one }) => ({
  client: one(clients, {
    fields: [clientSubscriptions.clientId],
    references: [clients.id],
  }),
  packagePrice: one(packagePrices, {
    fields: [clientSubscriptions.packagePriceId],
    references: [packagePrices.id],
  }),
  pet: one(pets, {
    fields: [clientSubscriptions.petId],
    references: [pets.id],
  }),
}))

export type SelectClientSubscription = typeof clientSubscriptions.$inferSelect

export const selectClientSubscriptionSchema = createSelectSchema(clientSubscriptions, {
  id: z4.uuid("ID inválido"),
  clientId: z4.uuid("Cliente inválido"),
  packagePriceId: z4.uuid("Preço do pacote inválido"),
  petId: z4.uuid("Pet inválido"),
  basePrice: z4.number(),
  finalPrice: z4.number(),
  adjustmentValue: z4.number(),
  adjustmentPercentage: z4.number(),
  adjustmentReason: z4.string(),
})

export type SelectClientSubscriptionList = z4.infer<typeof selectClientSubscriptionSchema>

export const insertClientSubscriptionSchema = createInsertSchema(clientSubscriptions, {
  clientId: z4.uuid("Cliente inválido"),
  packagePriceId: z4.uuid("Preço do pacote inválido"),
  petId: z4.uuid("Pet inválido"),
  pickupDayOfWeek: z4.number().min(0).max(6, "Dia da semana deve estar entre 0 e 6"),
  pickupTime: z4
    .string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Horário deve estar no formato HH:MM")
    .optional()
    .or(z4.null()),
  nextPickupDate: z4.number().optional().or(z4.null()),
  basePrice: z4.number().min(0, "Preço base deve ser maior que zero"),
  finalPrice: z4.number().min(0, "Preço final deve ser maior que zero"),
  adjustmentValue: z4.number().default(0),
  adjustmentPercentage: z4
    .number()
    .min(-100)
    .max(100, "Ajuste percentual deve estar entre -100% e 100%")
    .default(0),
  adjustmentReason: z4.string().optional().or(z4.literal("")).or(z4.null()),
  startDate: z4.number().min(1, "Data de início é obrigatória"),
  endDate: z4.number().optional().or(z4.null()),
  notes: z4
    .string()
    .max(500, "Observações são muito longas")
    .optional()
    .or(z4.literal(""))
    .or(z4.null()),
}).omit({
  createdAt: true,
  updatedAt: true,
  isActive: true,
  id: true,
})

export type InsertClientSubscription = z4.infer<typeof insertClientSubscriptionSchema>

export const updateClientSubscriptionSchema = insertClientSubscriptionSchema.partial().extend({
  isActive: z4.boolean(),
})

export type UpdateClientSubscription = z4.infer<typeof updateClientSubscriptionSchema>

export function calculateMultiPetDiscount(subscriptionCount: number): number {
  if (subscriptionCount >= 3) return -15
  if (subscriptionCount >= 2) return -10
  return 0
}

export function applyAdjustment(
  basePrice: number,
  adjustmentPercentage: number
): {
  finalPrice: number
  adjustmentValue: number
} {
  const adjustmentValue = (basePrice * adjustmentPercentage) / 100
  const finalPrice = basePrice + adjustmentValue
  return { finalPrice, adjustmentValue }
}

export const daysOfWeek = [
  { label: "Domingo", value: 0 },
  { label: "Segunda-feira", value: 1 },
  { label: "Terça-feira", value: 2 },
  { label: "Quarta-feira", value: 3 },
  { label: "Quinta-feira", value: 4 },
  { label: "Sexta-feira", value: 5 },
  { label: "Sábado", value: 6 },
] as const

export function calculateNextPickupDate(
  startDate: number,
  recurrence: number,
  pickupDayOfWeek: number
): number | undefined {
  const start = new Date(startDate)
  const today = new Date()

  const referenceDate = start > today ? start : today

  let nextDate = new Date(referenceDate)
  const currentDayOfWeek = nextDate.getDay()

  let daysUntilPickup = pickupDayOfWeek - currentDayOfWeek
  if (daysUntilPickup <= 0) {
    daysUntilPickup += 7

    nextDate.setDate(nextDate.getDate() + daysUntilPickup)

    if (recurrence > 7) {
      const weeksSinceStart = Math.floor(
        (nextDate.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)
      )
      const intervalWeeks = Math.ceil(recurrence / 7)
      const weeksToAdd =
        Math.ceil(weeksSinceStart / intervalWeeks) * intervalWeeks - weeksSinceStart
      nextDate.setDate(nextDate.getDate() + weeksToAdd * 7)
    }

    return nextDate.getTime()
  }
}

export function extractManualAdjustment(
  totalAdjustmentPercentage: number,
  adjustmentReason: string | null,
  estimatedPetCount: number = 2
): number {
  if (adjustmentReason === "desconto_multiplos_pets") {
    const estimatedAutoDiscount = calculateMultiPetDiscount(estimatedPetCount)
    return totalAdjustmentPercentage - estimatedAutoDiscount
  }
  return totalAdjustmentPercentage
}
