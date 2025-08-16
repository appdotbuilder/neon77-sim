import { db } from '../db';
import { depositsTable, usersTable } from '../db/schema';
import { type ProcessDepositInput, type Deposit } from '../schema';
import { eq, sql } from 'drizzle-orm';

export const processDeposit = async (input: ProcessDepositInput): Promise<Deposit> => {
  try {
    // Start a transaction to ensure atomic operations
    return await db.transaction(async (tx) => {
      // 1. Find deposit by deposit_id
      const deposits = await tx.select()
        .from(depositsTable)
        .where(eq(depositsTable.id, input.deposit_id))
        .execute();

      if (deposits.length === 0) {
        throw new Error(`Deposit with ID ${input.deposit_id} not found`);
      }

      const deposit = deposits[0];

      // Check if deposit is still pending
      if (deposit.status !== 'PENDING') {
        throw new Error(`Deposit with ID ${input.deposit_id} has already been processed`);
      }

      // 2. Update deposit status, admin_notes, and admin_response_image_url
      const updateData = {
        status: input.status,
        admin_notes: input.admin_notes || null,
        admin_response_image_url: input.admin_response_image_url || null,
        updated_at: sql`now()`
      };

      const updatedDeposits = await tx.update(depositsTable)
        .set(updateData)
        .where(eq(depositsTable.id, input.deposit_id))
        .returning()
        .execute();

      const updatedDeposit = updatedDeposits[0];

      // 3. If APPROVED: add amount to user's balance
      if (input.status === 'APPROVED') {
        await tx.update(usersTable)
          .set({
            balance: sql`${usersTable.balance} + ${updatedDeposit.amount}`,
            updated_at: sql`now()`
          })
          .where(eq(usersTable.id, updatedDeposit.user_id))
          .execute();
      }

      // 4. Return updated deposit with numeric field conversion
      return {
        ...updatedDeposit,
        amount: parseFloat(updatedDeposit.amount)
      };
    });
  } catch (error) {
    console.error('Process deposit failed:', error);
    throw error;
  }
};