import { integer, sqliteTable, text, real } from "drizzle-orm/sqlite-core"
import { v7 as uuid } from "uuid"
import { users } from "./auth"

export const clients = sqliteTable("clients", {
  id: text()
    .primaryKey()
    .$default(() => uuid()),
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

export const packages = sqliteTable("packages", {
  id: text()
    .primaryKey()
    .$default(() => uuid()),
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
