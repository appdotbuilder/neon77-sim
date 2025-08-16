import { z } from 'zod';

// User schema
export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string().email(),
  password_hash: z.string(),
  balance: z.number(),
  is_admin: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// User registration input schema
export const registerUserInputSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(6)
});

export type RegisterUserInput = z.infer<typeof registerUserInputSchema>;

// User login input schema
export const loginUserInputSchema = z.object({
  username: z.string(),
  password: z.string()
});

export type LoginUserInput = z.infer<typeof loginUserInputSchema>;

// Payment method enum
export const paymentMethodSchema = z.enum(['DANA', 'OVO', 'GOPAY', 'QRIS']);
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

// Transaction type enum
export const transactionTypeSchema = z.enum(['DEPOSIT', 'WITHDRAWAL']);
export type TransactionType = z.infer<typeof transactionTypeSchema>;

// Transaction status enum
export const transactionStatusSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED']);
export type TransactionStatus = z.infer<typeof transactionStatusSchema>;

// Deposit schema
export const depositSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  amount: z.number(),
  payment_method: paymentMethodSchema,
  target_number: z.string().nullable(),
  proof_image_url: z.string().nullable(),
  status: transactionStatusSchema,
  admin_response_image_url: z.string().nullable(),
  admin_notes: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Deposit = z.infer<typeof depositSchema>;

// Create deposit input schema
export const createDepositInputSchema = z.object({
  user_id: z.number(),
  amount: z.number().positive(),
  payment_method: paymentMethodSchema,
  proof_image_url: z.string().optional() // Only required for QRIS
});

export type CreateDepositInput = z.infer<typeof createDepositInputSchema>;

// Process deposit input schema (admin action)
export const processDepositInputSchema = z.object({
  deposit_id: z.number(),
  status: z.enum(['APPROVED', 'REJECTED']),
  admin_response_image_url: z.string().optional(),
  admin_notes: z.string().optional()
});

export type ProcessDepositInput = z.infer<typeof processDepositInputSchema>;

// Withdrawal schema
export const withdrawalSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  amount: z.number(),
  bank_name: z.string(),
  account_number: z.string(),
  account_holder_name: z.string(),
  status: transactionStatusSchema,
  admin_notes: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Withdrawal = z.infer<typeof withdrawalSchema>;

// Create withdrawal input schema
export const createWithdrawalInputSchema = z.object({
  user_id: z.number(),
  amount: z.number().positive(),
  bank_name: z.string(),
  account_number: z.string(),
  account_holder_name: z.string()
});

export type CreateWithdrawalInput = z.infer<typeof createWithdrawalInputSchema>;

// Process withdrawal input schema (admin action)
export const processWithdrawalInputSchema = z.object({
  withdrawal_id: z.number(),
  status: z.enum(['APPROVED', 'REJECTED']),
  admin_notes: z.string().optional()
});

export type ProcessWithdrawalInput = z.infer<typeof processWithdrawalInputSchema>;

// Admin login input schema
export const adminLoginInputSchema = z.object({
  username: z.string(),
  password: z.string()
});

export type AdminLoginInput = z.infer<typeof adminLoginInputSchema>;

// Get user deposits input schema
export const getUserDepositsInputSchema = z.object({
  user_id: z.number()
});

export type GetUserDepositsInput = z.infer<typeof getUserDepositsInputSchema>;

// Get user withdrawals input schema
export const getUserWithdrawalsInputSchema = z.object({
  user_id: z.number()
});

export type GetUserWithdrawalsInput = z.infer<typeof getUserWithdrawalsInputSchema>;

// Get user by ID input schema
export const getUserByIdInputSchema = z.object({
  user_id: z.number()
});

export type GetUserByIdInput = z.infer<typeof getUserByIdInputSchema>;