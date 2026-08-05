import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const users = pgTable('users', {
  id: uuid(),
  email: text('email').notNull().unique(),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  passwordHash: text('password_hash'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
})

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;