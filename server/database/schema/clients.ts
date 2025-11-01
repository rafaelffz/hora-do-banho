import { relations } from "drizzle-orm"
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { createInsertSchema, createSelectSchema } from "drizzle-zod"
import { v7 as uuid } from "uuid"
import z4 from "zod/v4"
import { users } from "./auth"
import { packagePrices } from "./package-prices"
import { pets, updatePetSchema } from "./pets"
import { clientSubscriptions } from "./client-subscriptions"

export const clients = sqliteTable("clients", {
  id: text()
    .primaryKey()
    .$default(() => uuid()),
  name: text().notNull(),
  email: text().unique(),
  avatar: text(),
  userId: text()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  phone: text(),
  address: text(),
  notes: text(),
  createdAt: integer()
    .notNull()
    .$defaultFn(() => Date.now()),
  updatedAt: integer()
    .notNull()
    .$onUpdateFn(() => Date.now()),
})

export const clientsRelations = relations(clients, ({ many }) => ({
  pets: many(pets),
  subscriptions: many(clientSubscriptions),
}))

export const selectClientSchema = createSelectSchema(clients)

export type SelectClient = z4.infer<typeof selectClientSchema>

export const selectClientSchemaWithPets = selectClientSchema.extend({
  pets: z4.array(updatePetSchema),
})

export type SelectClientWithPets = z4.infer<typeof selectClientSchemaWithPets>

export const insertClientSchema = createInsertSchema(clients, {
  name: z4.string().min(1, "Nome é obrigatório"),
  email: z4.email("Email inválido").optional().or(z4.literal("")).or(z4.null()),
  phone: z4.string().min(10, "Telefone inválido").optional().or(z4.literal("")).or(z4.null()),
  address: z4.string().min(5, "Endereço inválido").optional().or(z4.literal("")).or(z4.null()),
  notes: z4
    .string()
    .max(500, "Observações são muito longas")
    .optional()
    .or(z4.literal(""))
    .or(z4.null()),
}).omit({
  createdAt: true,
  updatedAt: true,
  userId: true,
  id: true,
})

export const insertClientWithPetsSchema = insertClientSchema.extend({
  pets: z4.array(updatePetSchema).optional().or(z4.null()),
})

export const insertClientWithPetsAndSubscriptionsSchema = insertClientSchema.extend({
  pets: z4
    .array(
      updatePetSchema.extend({
        subscription: z4
          .object({
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
    )
    .optional()
    .or(z4.null()),
})

export type InsertClientWithPets = z4.infer<typeof insertClientWithPetsSchema>
export type InsertClientWithPetsAndSubscriptions = z4.infer<
  typeof insertClientWithPetsAndSubscriptionsSchema
>

export type InsertClient = z4.infer<typeof insertClientSchema>

export const updateClientSchema = insertClientSchema.partial()

export const updateClientWithPetsSchema = updateClientSchema.extend({
  pets: z4.array(updatePetSchema).optional().or(z4.null()),
})

export const updateClientWithPetsAndSubscriptionsSchema = updateClientSchema.extend({
  pets: z4
    .array(
      updatePetSchema.extend({
        subscription: z4
          .object({
            id: z4.string().optional(),
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
            isActive: z4.boolean().default(true),
          })
          .optional()
          .or(z4.null()),
      })
    )
    .optional()
    .or(z4.null()),
})

export type UpdateClient = z4.infer<typeof updateClientSchema>
export type UpdateClientWithPets = z4.infer<typeof updateClientWithPetsSchema>
export type UpdateClientWithPetsAndSubscriptions = z4.infer<
  typeof updateClientWithPetsAndSubscriptionsSchema
>

export type ClientWithActiveSubscriptions = {
  id: string
  name: string
  email: string | null
  phone: string | null
  avatar: string | null
  address: string | null
  notes: string | null
  createdAt: number
  subscriptions: {
    id: string
    petId: string
    petName: string
    packagePriceId: string
    packageName: string
    recurrence: number
    price: number
    pickupDayOfWeek: number
    pickupTime: string | null
    nextPickupDate: number | null
    finalPrice: number
    isActive: boolean
  }[]
}
