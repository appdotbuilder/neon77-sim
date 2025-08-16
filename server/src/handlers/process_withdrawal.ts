import { db } from '../db';
import { withdrawalsTable, usersTable } from '../db/schema';
import { type ProcessWithdrawalInput, type Withdrawal } from '../schema';
import { eq } from 'drizzle-orm';

export async function processWithdrawal(input: ProcessWithdrawalInput): Promise<Withdrawal> {
  try {
    // First, find the withdrawal by ID
    const existingWithdrawals = await db.select()
      .from(withdrawalsTable)
      .where(eq(withdrawalsTable.id, input.withdrawal_id))
      .execute();

    if (existingWithdrawals.length === 0) {
      throw new Error('Withdrawal not found');
    }

    const withdrawal = existingWithdrawals[0];

    // Check if withdrawal is already processed
    if (withdrawal.status !== 'PENDING') {
      throw new Error('Withdrawal has already been processed');
    }

    // Handle balance changes based on status
    if (input.status === 'APPROVED') {
      // Get current user balance
      const users = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, withdrawal.user_id))
        .execute();

      if (users.length === 0) {
        throw new Error('User not found');
      }

      const currentBalance = parseFloat(users[0].balance);
      const withdrawalAmount = parseFloat(withdrawal.amount);
      const newBalance = currentBalance - withdrawalAmount;
      
      if (newBalance < 0) {
        throw new Error('Insufficient balance for withdrawal');
      }

      // Deduct amount from user's balance
      await db.update(usersTable)
        .set({
          balance: newBalance.toString(),
          updated_at: new Date()
        })
        .where(eq(usersTable.id, withdrawal.user_id))
        .execute();
    }
    // Note: For REJECTED status, we don't need to modify balance as the withdrawal never happened

    // Update withdrawal status and admin notes
    const updatedWithdrawals = await db.update(withdrawalsTable)
      .set({
        status: input.status,
        admin_notes: input.admin_notes || null,
        updated_at: new Date()
      })
      .where(eq(withdrawalsTable.id, input.withdrawal_id))
      .returning()
      .execute();

    const updatedWithdrawal = updatedWithdrawals[0];

    // Convert numeric fields back to numbers
    return {
      ...updatedWithdrawal,
      amount: parseFloat(updatedWithdrawal.amount)
    };
  } catch (error) {
    console.error('Withdrawal processing failed:', error);
    throw error;
  }
}