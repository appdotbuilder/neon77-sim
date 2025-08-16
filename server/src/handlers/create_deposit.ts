import { db } from '../db';
import { depositsTable, usersTable } from '../db/schema';
import { type CreateDepositInput, type Deposit } from '../schema';
import { eq } from 'drizzle-orm';

export const createDeposit = async (input: CreateDepositInput): Promise<Deposit> => {
  try {
    // Validate that the user exists
    const userExists = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (userExists.length === 0) {
      throw new Error(`User with ID ${input.user_id} does not exist`);
    }

    // Validate that QRIS deposits include proof_image_url
    if (input.payment_method === 'QRIS' && !input.proof_image_url) {
      throw new Error('QRIS deposits require proof_image_url');
    }

    // Set appropriate target numbers based on payment method
    let target_number = null;
    switch (input.payment_method) {
      case 'DANA':
        target_number = '083176891367';
        break;
      case 'OVO':
      case 'GOPAY':
        target_number = '083194537338';
        break;
      case 'QRIS':
        // No target number for QRIS
        target_number = null;
        break;
    }

    // Insert deposit record
    const result = await db.insert(depositsTable)
      .values({
        user_id: input.user_id,
        amount: input.amount.toString(), // Convert number to string for numeric column
        payment_method: input.payment_method,
        target_number,
        proof_image_url: input.proof_image_url || null,
        status: 'PENDING'
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const deposit = result[0];
    return {
      ...deposit,
      amount: parseFloat(deposit.amount) // Convert string back to number
    };
  } catch (error) {
    console.error('Deposit creation failed:', error);
    throw error;
  }
};