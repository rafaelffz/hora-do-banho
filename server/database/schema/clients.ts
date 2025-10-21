import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { v7 as uuid } from "uuid"
import { users } from "./auth"
import { createInsertSchema } from "drizzle-zod"
import z4 from "zod/v4"
import { insertPetSchema, pets, updatePetSchema } from "./pets"
import { relations } from "drizzle-orm"

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
  isActive: integer({ mode: "boolean" }).notNull().default(true),
  createdAt: integer()
    .notNull()
    .$defaultFn(() => Date.now()),
  updatedAt: integer()
    .notNull()
    .$onUpdateFn(() => Date.now()),
})

export const clientsRelations = relations(clients, ({ many }) => ({
  pets: many(pets),
}))

export type SelectClient = typeof clients.$inferSelect

export const insertClientSchema = createInsertSchema(clients, {
  name: z4.string().min(1, "Nome é obrigatório"),
  email: z4.email("Email inválido").optional().or(z4.literal("")).or(z4.null()),
  phone: z4.string().min(10, "Telefone inválido").optional().or(z4.literal("")).or(z4.null()),
  address: z4.string().min(5, "Endereço inválido"),
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
  isActive: true,
  id: true,
})

export const insertClientWithPetsSchema = insertClientSchema.extend({
  pets: z4.array(insertPetSchema).optional().or(z4.null()),
})

export type InsertClientWithPets = z4.infer<typeof insertClientWithPetsSchema>

export type InsertClient = z4.infer<typeof insertClientSchema>

export const updateClientSchema = insertClientSchema.partial().extend({
  isActive: z4.boolean(),
})

export const updateClientWithPetsSchema = updateClientSchema.extend({
  pets: z4.array(updatePetSchema).optional().or(z4.null()),
})

export type UpdateClient = z4.infer<typeof updateClientSchema>
export type UpdateClientWithPets = z4.infer<typeof updateClientWithPetsSchema>
