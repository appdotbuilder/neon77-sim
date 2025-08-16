import { db } from '../db';
import { usersTable, withdrawalsTable } from '../db/schema';
import { type CreateWithdrawalInput, type Withdrawal } from '../schema';
import { eq } from 'drizzle-orm';

export const createWithdrawal = async (input: CreateWithdrawalInput): Promise<Withdrawal> => {
  try {
    // First, verify that the user exists and has sufficient balance
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (users.length === 0) {
      throw new Error(`User with ID ${input.user_id} not found`);
    }

    const user = users[0];
    const currentBalance = parseFloat(user.balance);

    if (currentBalance < input.amount) {
      throw new Error(`Insufficient balance. Current balance: ${currentBalance}, requested withdrawal: ${input.amount}`);
    }

    // Create withdrawal record with PENDING status
    const result = await db.insert(withdrawalsTable)
      .values({
        user_id: input.user_id,
        amount: input.amount.toString(), // Convert number to string for numeric column
        bank_name: input.bank_name,
        account_number: input.account_number,
        account_holder_name: input.account_holder_name,
        status: 'PENDING'
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const withdrawal = result[0];
    return {
      ...withdrawal,
      amount: parseFloat(withdrawal.amount) // Convert string back to number
    };
  } catch (error) {
    console.error('Withdrawal creation failed:', error);
    throw error;
  }
};