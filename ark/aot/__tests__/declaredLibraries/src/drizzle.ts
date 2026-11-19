import { createInsertSchema, createSelectSchema } from "drizzle-arktype"
import { integer, pgTable, text } from "drizzle-orm/pg-core"

export const users = pgTable("users", {
	id: integer().primaryKey().generatedAlwaysAsIdentity(),
	name: text().notNull(),
	bio: text()
})

export const SelectUser = createSelectSchema(users)

export const InsertUser = createInsertSchema(users)

export const insert = (user: typeof InsertUser.infer) => user
