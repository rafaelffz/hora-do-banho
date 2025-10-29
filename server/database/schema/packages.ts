import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { v7 as uuid } from "uuid"
import { users } from "./auth"
import { createInsertSchema, createSelectSchema } from "drizzle-zod"
import { relations } from "drizzle-orm"
import z4 from "zod/v4"
import { packagePrices } from "./package-prices"
import { clientSubscriptions } from "./client-subscriptions"

export const packages = sqliteTable("packages", {
  id: text()
    .primaryKey()
    .$default(() => uuid()),
  userId: text()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text().notNull(),
  description: text(),
  duration: integer().notNull(),
  isActive: integer({ mode: "boolean" }).notNull().default(true),
  createdAt: integer()
    .notNull()
    .$defaultFn(() => Date.now()),
  updatedAt: integer()
    .notNull()
    .$onUpdateFn(() => Date.now()),
})

export const packagesRelations = relations(packages, ({ many }) => ({
  pricesByRecurrence: many(packagePrices),
  subscriptions: many(clientSubscriptions),
}))

export type SelectPackage = typeof packages.$inferSelect

export const selectPackageListSchema = createSelectSchema(packages, {
  id: z4.uuid("ID inválido"),
  name: z4.string(),
})
  .omit({
    userId: true,
    duration: true,
    description: true,
    isActive: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    recurrence: z4.number().optional(),
  })

export type SelectPackageList = z4.infer<typeof selectPackageListSchema>

export const insertPackageSchema = createInsertSchema(packages, {
  name: z4.string().min(1, "Nome é obrigatório"),
  description: z4.string().optional().or(z4.literal("")).or(z4.null()),
  duration: z4.number().min(1, "Duração deve ser maior que zero"),
}).omit({
  createdAt: true,
  updatedAt: true,
  userId: true,
  isActive: true,
  id: true,
})

export type InsertPackage = z4.infer<typeof insertPackageSchema>

export const insertPackageWithPricesSchema = insertPackageSchema.extend({
  pricesByRecurrence: z4.array(
    z4.object({
      recurrence: z4.number().min(1, "Recorrência deve ser maior que zero"),
      price: z4.number().min(0),
    })
  ),
})

export type InsertPackageWithPrices = z4.infer<typeof insertPackageWithPricesSchema>

export const updatePackageSchema = insertPackageSchema.partial().extend({
  isActive: z4.boolean(),
})

export type UpdatePackage = z4.infer<typeof updatePackageSchema>

export const updatePackageWithPricesSchema = updatePackageSchema.extend({
  pricesByRecurrence: z4.array(
    z4.object({
      id: z4.string().optional().or(z4.literal("")),
      recurrence: z4.number().min(1, "Recorrência deve ser maior que zero"),
      price: z4.number().min(0),
    })
  ),
})

export type UpdatePackageWithPrices = z4.infer<typeof updatePackageWithPricesSchema>

export const packageCategories = [
  { label: "Banho", value: "banho" },
  { label: "Tosa", value: "tosa" },
  { label: "Banho e Tosa", value: "banho_e_tosa" },
  { label: "Hidratação", value: "hidratacao" },
  { label: "Corte de Unhas", value: "corte_unhas" },
  { label: "Limpeza de Ouvidos", value: "limpeza_ouvidos" },
] as const
