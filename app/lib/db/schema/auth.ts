import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { v7 as uuid } from "uuid";

export const user = sqliteTable("user", {
  id: text()
    .primaryKey()
    .$default(() => uuid()),
  name: text().notNull(),
  email: text().notNull().unique(),
  emailVerified: integer({ mode: "boolean" }).notNull(),
  image: text(),
  createdAt: integer().notNull(),
  updatedAt: integer().notNull(),
});

export const session = sqliteTable("session", {
  id: integer().primaryKey({ autoIncrement: true }),
  expiresAt: integer().notNull(),
  token: text().notNull().unique(),
  createdAt: integer().notNull(),
  updatedAt: integer().notNull(),
  ipAddress: text(),
  userAgent: text(),
  userId: integer()
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = sqliteTable("account", {
  id: integer().primaryKey({ autoIncrement: true }),
  accountId: text().notNull(),
  providerId: text().notNull(),
  userId: integer()
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text(),
  refreshToken: text(),
  idToken: text(),
  accessTokenExpiresAt: integer(),
  refreshTokenExpiresAt: integer(),
  scope: text(),
  password: text(),
  createdAt: integer().notNull(),
  updatedAt: integer().notNull(),
});

export const verification = sqliteTable("verification", {
  id: integer().primaryKey({ autoIncrement: true }),
  identifier: text().notNull(),
  value: text().notNull(),
  expiresAt: integer().notNull(),
  createdAt: integer(),
  updatedAt: integer(),
});
