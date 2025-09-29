import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { v7 as uuid } from "uuid";

export const users = sqliteTable("users", {
  id: text()
    .primaryKey()
    .$default(() => uuid()),
  name: text().notNull(),
  email: text().notNull().unique(),
  image: text(),
  createdAt: integer()
    .notNull()
    .$defaultFn(() => Date.now()),
  updatedAt: integer()
    .notNull()
    .$onUpdateFn(() => Date.now()),
});
