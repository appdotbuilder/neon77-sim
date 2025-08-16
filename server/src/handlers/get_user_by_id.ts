import { db } from '../db';
import { usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type GetUserByIdInput, type User } from '../schema';

export const getUserById = async (input: GetUserByIdInput): Promise<User> => {
  try {
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (users.length === 0) {
      throw new Error(`User with ID ${input.user_id} not found`);
    }

    // Convert numeric field back to number
    const user = users[0];
    return {
      ...user,
      balance: parseFloat(user.balance) // Convert string back to number
    };
  } catch (error) {
    console.error('Failed to get user by ID:', error);
    throw error;
  }
};