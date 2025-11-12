import { relations } from "drizzle-orm"
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { createInsertSchema, createUpdateSchema } from "drizzle-zod"
import { v7 as uuid } from "uuid"
import z4 from "zod/v4"
import { clients } from "./clients"
import { packagePrices } from "./package-prices"
import { pets } from "./pets"

export const schedulingStatusEnum = ["scheduled", "completed", "cancelled"] as const

export const schedulings = sqliteTable("schedulings", {
  id: text()
    .primaryKey()
    .$default(() => uuid()),
  clientId: text().references(() => clients.id, { onDelete: "cascade" }),
  pickupDate: integer().notNull(),
  pickupTime: text(),
  status: text({ enum: schedulingStatusEnum }).notNull().default("scheduled"),
  basePrice: real().notNull(),
  finalPrice: real().notNull(),
  adjustmentValue: real().default(0),
  adjustmentPercentage: real().default(0),
  adjustmentReason: text(),
  notes: text(),
  createdAt: integer()
    .notNull()
    .$defaultFn(() => Date.now()),
  updatedAt: integer()
    .notNull()
    .$onUpdateFn(() => Date.now()),
})

export const schedulingPets = sqliteTable("scheduling_pets", {
  id: text()
    .primaryKey()
    .$default(() => uuid()),
  schedulingId: text()
    .notNull()
    .references(() => schedulings.id, { onDelete: "cascade" }),
  petId: text()
    .notNull()
    .references(() => pets.id, { onDelete: "cascade" }),
  packagePriceId: text().references(() => packagePrices.id, { onDelete: "restrict" }),
  createdAt: integer()
    .notNull()
    .$defaultFn(() => Date.now()),
  updatedAt: integer()
    .notNull()
    .$onUpdateFn(() => Date.now()),
})

export const schedulingsRelations = relations(schedulings, ({ one, many }) => ({
  client: one(clients, {
    fields: [schedulings.clientId],
    references: [clients.id],
  }),
  schedulingPets: many(schedulingPets),
}))

export const schedulingPetsRelations = relations(schedulingPets, ({ one }) => ({
  scheduling: one(schedulings, {
    fields: [schedulingPets.schedulingId],
    references: [schedulings.id],
  }),
  pet: one(pets, {
    fields: [schedulingPets.petId],
    references: [pets.id],
  }),
  packagePrice: one(packagePrices, {
    fields: [schedulingPets.packagePriceId],
    references: [packagePrices.id],
  }),
}))

export type SelectScheduling = typeof schedulings.$inferSelect
export type SelectSchedulingPet = typeof schedulingPets.$inferSelect

export const insertSchedulingSchema = createInsertSchema(schedulings, {
  clientId: z4.uuid("Cliente inválido"),
  pickupDate: z4.number().min(1, "Data do agendamento é obrigatória"),
  pickupTime: z4.string().optional().or(z4.null()),
  basePrice: z4.number().min(0, "Preço base deve ser maior que zero"),
  finalPrice: z4.number().min(0, "Preço total deve ser maior que zero"),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})

export type InsertScheduling = z4.infer<typeof insertSchedulingSchema>

export const insertSchedulingWithPetsSchema = insertSchedulingSchema.extend({
  petIds: z4.array(z4.uuid("Pet inválido")).min(1, "Pelo menos um pet deve ser selecionado"),
})

export type InsertSchedulingWithPets = z4.infer<typeof insertSchedulingWithPetsSchema>

export const updateSchedulingSchema = createUpdateSchema(schedulings, {
  status: z4.enum(schedulingStatusEnum),
  adjustmentValue: z4.number().min(0, "Valor de ajuste inválido").default(0),
  adjustmentReason: z4.string().max(500, "Motivo do ajuste é muito longo").optional().or(z4.null()),
}).omit({
  id: true,
  clientId: true,
  pickupDate: true,
  pickupTime: true,
  basePrice: true,
  finalPrice: true,
  createdAt: true,
  updatedAt: true,
})

export type UpdateScheduling = z4.infer<typeof updateSchedulingSchema>
