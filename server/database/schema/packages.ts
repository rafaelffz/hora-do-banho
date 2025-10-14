import { integer, sqliteTable, text, real } from "drizzle-orm/sqlite-core"
import { v7 as uuid } from "uuid"
import { users } from "./auth"
import { createInsertSchema } from "drizzle-zod"
import z4 from "zod/v4"

export const packages = sqliteTable("packages", {
  id: text()
    .primaryKey()
    .$default(() => uuid()),
  userId: text()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text().notNull(),
  description: text(),
  price: real().notNull(),
  duration: integer().notNull(),
  isActive: integer({ mode: "boolean" }).notNull().default(true),
  createdAt: integer()
    .notNull()
    .$defaultFn(() => Date.now()),
  updatedAt: integer()
    .notNull()
    .$onUpdateFn(() => Date.now()),
})

export type SelectPackage = typeof packages.$inferSelect

export const insertPackageSchema = createInsertSchema(packages, {
  name: z4.string().min(1, "Nome é obrigatório"),
  description: z4.string().optional().or(z4.literal("")).or(z4.null()),
  price: z4.number().min(0, "Preço deve ser maior que zero"),
  duration: z4.number().min(1, "Duração deve ser maior que zero"),
}).omit({
  createdAt: true,
  updatedAt: true,
  userId: true,
  isActive: true,
  id: true,
})

export type InsertPackage = z4.infer<typeof insertPackageSchema>

export const updatePackageSchema = insertPackageSchema.partial().extend({
  isActive: z4.boolean(),
})

export type UpdatePackage = z4.infer<typeof updatePackageSchema>
