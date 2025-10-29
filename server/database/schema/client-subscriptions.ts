import { integer, sqliteTable, text, real } from "drizzle-orm/sqlite-core"
import { v7 as uuid } from "uuid"
import { clients } from "./clients"
import { packages } from "./packages"
import { pets } from "./pets"
import { createInsertSchema, createSelectSchema } from "drizzle-zod"
import z4 from "zod/v4"
import { relations } from "drizzle-orm"

export const clientSubscriptions = sqliteTable("client_subscriptions", {
  id: text()
    .primaryKey()
    .$default(() => uuid()),
  clientId: text()
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" }),
  packageId: text()
    .notNull()
    .references(() => packages.id, { onDelete: "cascade" }),
  petId: text()
    .notNull()
    .references(() => pets.id, { onDelete: "cascade" }),
  recurrence: integer().notNull(),
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
  package: one(packages, {
    fields: [clientSubscriptions.packageId],
    references: [packages.id],
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
  packageId: z4.uuid("Pacote inválido"),
  petId: z4.uuid("Pet inválido"),
  recurrence: z4.number(),
  basePrice: z4.number(),
  finalPrice: z4.number(),
  adjustmentValue: z4.number(),
  adjustmentPercentage: z4.number(),
  adjustmentReason: z4.string(),
})

export type SelectClientSubscriptionList = z4.infer<typeof selectClientSubscriptionSchema>

export const insertClientSubscriptionSchema = createInsertSchema(clientSubscriptions, {
  clientId: z4.uuid("Cliente inválido"),
  packageId: z4.uuid("Pacote inválido"),
  petId: z4.uuid("Pet inválido"),
  recurrence: z4.number().min(1, "Recorrência deve ser maior que zero"),
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

export const adjustmentReasons = [
  { label: "Desconto múltiplos pets", value: "desconto_multiplos_pets" },
  { label: "Desconto fidelidade", value: "desconto_fidelidade" },
  { label: "Taxa de deslocamento", value: "taxa_deslocamento" },
  { label: "Taxa de urgência", value: "taxa_urgencia" },
  { label: "Desconto promocional", value: "desconto_promocional" },
  { label: "Acréscimo por dificuldade", value: "acrescimo_dificuldade" },
  { label: "Outros", value: "outros" },
] as const
