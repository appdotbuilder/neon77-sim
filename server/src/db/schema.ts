import { serial, text, pgTable, timestamp, numeric, integer, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enum definitions
export const paymentMethodEnum = pgEnum('payment_method', ['DANA', 'OVO', 'GOPAY', 'QRIS']);
export const transactionTypeEnum = pgEnum('transaction_type', ['DEPOSIT', 'WITHDRAWAL']);
export const transactionStatusEnum = pgEnum('transaction_status', ['PENDING', 'APPROVED', 'REJECTED']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  balance: numeric('balance', { precision: 12, scale: 2 }).notNull().default('0.00'),
  is_admin: boolean('is_admin').notNull().default(false),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Deposits table
export const depositsTable = pgTable('deposits', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  payment_method: paymentMethodEnum('payment_method').notNull(),
  target_number: text('target_number'), // Nullable - only for DANA, OVO, GoPay
  proof_image_url: text('proof_image_url'), // Nullable - required for QRIS
  status: transactionStatusEnum('status').notNull().default('PENDING'),
  admin_response_image_url: text('admin_response_image_url'), // Nullable - admin can send confirmation image
  admin_notes: text('admin_notes'), // Nullable - admin notes for processing
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Withdrawals table
export const withdrawalsTable = pgTable('withdrawals', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  bank_name: text('bank_name').notNull(),
  account_number: text('account_number').notNull(),
  account_holder_name: text('account_holder_name').notNull(),
  status: transactionStatusEnum('status').notNull().default('PENDING'),
  admin_notes: text('admin_notes'), // Nullable - admin notes for processing
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  deposits: many(depositsTable),
  withdrawals: many(withdrawalsTable),
}));

export const depositsRelations = relations(depositsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [depositsTable.user_id],
    references: [usersTable.id],
  }),
}));

export const withdrawalsRelations = relations(withdrawalsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [withdrawalsTable.user_id],
    references: [usersTable.id],
  }),
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

export type Deposit = typeof depositsTable.$inferSelect;
export type NewDeposit = typeof depositsTable.$inferInsert;

export type Withdrawal = typeof withdrawalsTable.$inferSelect;
export type NewWithdrawal = typeof withdrawalsTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = { 
  users: usersTable, 
  deposits: depositsTable, 
  withdrawals: withdrawalsTable 
};

export const tableRelations = {
  usersRelations,
  depositsRelations,
  withdrawalsRelations
};