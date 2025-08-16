import { db } from '../db';
import { depositsTable, usersTable } from '../db/schema';
import { type Deposit } from '../schema';
import { desc, eq } from 'drizzle-orm';

export const getAllDeposits = async (): Promise<Deposit[]> => {
  try {
    // Query all deposits with user information via JOIN
    const results = await db.select()
      .from(depositsTable)
      .innerJoin(usersTable, eq(depositsTable.user_id, usersTable.id))
      .orderBy(desc(depositsTable.created_at))
      .execute();

    // Convert numeric fields and format for return
    return results.map(result => ({
      id: result.deposits.id,
      user_id: result.deposits.user_id,
      amount: parseFloat(result.deposits.amount), // Convert numeric to number
      payment_method: result.deposits.payment_method,
      target_number: result.deposits.target_number,
      proof_image_url: result.deposits.proof_image_url,
      status: result.deposits.status,
      admin_response_image_url: result.deposits.admin_response_image_url,
      admin_notes: result.deposits.admin_notes,
      created_at: result.deposits.created_at,
      updated_at: result.deposits.updated_at
    }));
  } catch (error) {
    console.error('Failed to fetch all deposits:', error);
    throw error;
  }
};