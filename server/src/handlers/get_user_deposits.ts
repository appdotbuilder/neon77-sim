import { db } from '../db';
import { depositsTable } from '../db/schema';
import { type GetUserDepositsInput, type Deposit } from '../schema';
import { eq, desc } from 'drizzle-orm';

export const getUserDeposits = async (input: GetUserDepositsInput): Promise<Deposit[]> => {
  try {
    const results = await db.select()
      .from(depositsTable)
      .where(eq(depositsTable.user_id, input.user_id))
      .orderBy(desc(depositsTable.created_at))
      .execute();

    // Convert numeric fields back to numbers for all deposits
    return results.map(deposit => ({
      ...deposit,
      amount: parseFloat(deposit.amount) // Convert numeric field from string to number
    }));
  } catch (error) {
    console.error('Failed to get user deposits:', error);
    throw error;
  }
};