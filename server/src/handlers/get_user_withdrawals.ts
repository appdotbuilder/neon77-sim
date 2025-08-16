import { db } from '../db';
import { withdrawalsTable } from '../db/schema';
import { type GetUserWithdrawalsInput, type Withdrawal } from '../schema';
import { eq, desc } from 'drizzle-orm';

export const getUserWithdrawals = async (input: GetUserWithdrawalsInput): Promise<Withdrawal[]> => {
  try {
    const results = await db.select()
      .from(withdrawalsTable)
      .where(eq(withdrawalsTable.user_id, input.user_id))
      .orderBy(desc(withdrawalsTable.created_at))
      .execute();

    // Convert numeric fields back to numbers before returning
    return results.map(withdrawal => ({
      ...withdrawal,
      amount: parseFloat(withdrawal.amount) // Convert string back to number
    }));
  } catch (error) {
    console.error('Failed to fetch user withdrawals:', error);
    throw error;
  }
};