import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { v7 as uuid } from "uuid"
import { clients } from "./clients"
import { createInsertSchema } from "drizzle-zod"
import z4 from "zod/v4"
import { relations } from "drizzle-orm"

export const pets = sqliteTable("pets", {
  id: text()
    .primaryKey()
    .$default(() => uuid()),
  clientId: text()
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" }),
  name: text().notNull(),
  breed: text(),
  size: text({ enum: ["small", "medium", "large"] }),
  weight: real(),
  notes: text(),
  createdAt: integer()
    .notNull()
    .$defaultFn(() => Date.now()),
  updatedAt: integer()
    .notNull()
    .$onUpdateFn(() => Date.now()),
})

export const petsRelations = relations(pets, ({ one }) => ({
  client: one(clients, {
    fields: [pets.clientId],
    references: [clients.id],
  }),
}))

export const petSizes = [
  { label: "Pequeno", value: "small" },
  { label: "Médio", value: "medium" },
  { label: "Grande", value: "large" },
]

export type SelectPet = typeof pets.$inferSelect

export const insertPetSchema = createInsertSchema(pets, {
  name: z4.string().min(1, "Nome é obrigatório"),
  breed: z4.string().optional().or(z4.literal("")).or(z4.undefined()),
  size: z4.enum(["small", "medium", "large"]).optional().or(z4.undefined()),
  weight: z4.number().min(0, "Peso inválido").optional().or(z4.null()),
  notes: z4
    .string()
    .max(500, "Observações são muito longas")
    .optional()
    .or(z4.literal(""))
    .or(z4.null()),
}).omit({
  createdAt: true,
  updatedAt: true,
  clientId: true,
  id: true,
})

export type InsertPet = z4.infer<typeof insertPetSchema>

export const insertPetWithSubscriptionsSchema = insertPetSchema.extend({
  subscription: z4
    .object({
      id: z4.string().optional().or(z4.null()),
      packagePriceId: z4.uuidv7(),
      pickupDayOfWeek: z4.number().min(0).max(6),
      pickupTime: z4
        .string()
        .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .optional()
        .or(z4.null()),
      startDate: z4.number().min(1),
      adjustmentPercentage: z4.number().min(-100).max(100).default(0),
      adjustmentReason: z4.string().optional().or(z4.literal("")).or(z4.null()),
      notes: z4.string().max(500).optional().or(z4.literal("")).or(z4.null()),
    })
    .optional()
    .or(z4.null()),
})

export type InsertPetWithSubscriptions = z4.infer<typeof insertPetWithSubscriptionsSchema>

export const updatePetSchema = insertPetSchema.extend({
  id: z4.string(),
})

export type UpdatePet = z4.infer<typeof updatePetSchema>
