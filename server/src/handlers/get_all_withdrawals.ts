import { db } from '../db';
import { withdrawalsTable, usersTable } from '../db/schema';
import { type Withdrawal } from '../schema';
import { eq, desc } from 'drizzle-orm';

export const getAllWithdrawals = async (): Promise<Withdrawal[]> => {
  try {
    // Query all withdrawals with user information via JOIN
    const results = await db.select()
      .from(withdrawalsTable)
      .innerJoin(usersTable, eq(withdrawalsTable.user_id, usersTable.id))
      .orderBy(desc(withdrawalsTable.created_at))
      .execute();

    // Map results to proper Withdrawal schema format with numeric conversion
    return results.map(result => ({
      id: result.withdrawals.id,
      user_id: result.withdrawals.user_id,
      amount: parseFloat(result.withdrawals.amount), // Convert numeric to number
      bank_name: result.withdrawals.bank_name,
      account_number: result.withdrawals.account_number,
      account_holder_name: result.withdrawals.account_holder_name,
      status: result.withdrawals.status,
      admin_notes: result.withdrawals.admin_notes,
      created_at: result.withdrawals.created_at,
      updated_at: result.withdrawals.updated_at
    }));
  } catch (error) {
    console.error('Get all withdrawals failed:', error);
    throw error;
  }
};