import { integer, sqliteTable, text, real } from "drizzle-orm/sqlite-core"
import { v7 as uuid } from "uuid"
import { packages } from "./packages"
import { createInsertSchema, createSelectSchema } from "drizzle-zod"
import z4 from "zod/v4"
import { relations } from "drizzle-orm"

export const packagePrices = sqliteTable("package_prices", {
  id: text()
    .primaryKey()
    .$default(() => uuid()),
  packageId: text()
    .notNull()
    .references(() => packages.id, { onDelete: "cascade" }),
  recurrence: integer().notNull(),
  price: real().notNull(),
  isActive: integer({ mode: "boolean" }).notNull().default(true),
  createdAt: integer()
    .notNull()
    .$defaultFn(() => Date.now()),
  updatedAt: integer()
    .notNull()
    .$onUpdateFn(() => Date.now()),
})

export const packagePricesRelations = relations(packagePrices, ({ one }) => ({
  package: one(packages, {
    fields: [packagePrices.packageId],
    references: [packages.id],
  }),
}))

export type SelectPackagePrice = typeof packagePrices.$inferSelect

export const selectPackagePriceSchema = createSelectSchema(packagePrices, {
  id: z4.uuid("ID inválido"),
  packageId: z4.uuid("Pacote inválido"),
  recurrence: z4.number(),
  price: z4.number(),
})

export type SelectPackagePriceList = z4.infer<typeof selectPackagePriceSchema>

export type SelectPackageList = {
  id: string
  name: string
  recurrence: number
  price: number
}

export const insertPackagePriceSchema = createInsertSchema(packagePrices, {
  packageId: z4.uuid("Pacote inválido").optional().or(z4.literal("")),
  recurrence: z4.number().min(1, "Recorrência deve ser maior que zero"),
  price: z4.number().min(0, "Preço deve ser maior que zero"),
}).omit({
  createdAt: true,
  updatedAt: true,
  isActive: true,
  id: true,
})

export type InsertPackagePrice = z4.infer<typeof insertPackagePriceSchema>

export const updatePackagePriceSchema = insertPackagePriceSchema.partial().extend({
  id: z4.uuid("ID inválido").optional().or(z4.literal("")),
})

export type UpdatePackagePrice = z4.infer<typeof updatePackagePriceSchema>

export const recurrenceOptions = [
  { label: "Semanal (7 dias)", value: 7 },
  { label: "Quinzenal (15 dias)", value: 15 },
  { label: "Mensal (30 dias)", value: 30 },
  { label: "Bimestral (60 dias)", value: 60 },
] as const
