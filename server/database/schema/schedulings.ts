import { integer, sqliteTable, text, real } from "drizzle-orm/sqlite-core"
import { v7 as uuid } from "uuid"
import { clients } from "./clients"
import { packages } from "./packages"

export const schedulingStatusEnum = [
  "scheduled",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
] as const

export const schedulings = sqliteTable("schedulings", {
  id: text()
    .primaryKey()
    .$default(() => uuid()),
  clientId: text()
    .notNull()
    .references(() => clients.id, { onDelete: "cascade" }),
  packageId: text().references(() => packages.id, { onDelete: "restrict" }),
  schedulingDate: integer().notNull(),
  status: text({ enum: schedulingStatusEnum }).notNull().default("scheduled"),
  totalPrice: real().notNull(),
  notes: text(),
  startedAt: integer(),
  completedAt: integer(),
  createdAt: integer()
    .notNull()
    .$defaultFn(() => Date.now()),
  updatedAt: integer()
    .notNull()
    .$onUpdateFn(() => Date.now()),
})

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
  isActive: integer({ mode: "boolean" }).notNull().default(true),
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
  createdAt: integer()
    .notNull()
    .$defaultFn(() => Date.now()),
})
