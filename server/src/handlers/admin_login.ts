import { db } from '../db';
import { usersTable } from '../db/schema';
import { type AdminLoginInput, type User } from '../schema';
import { eq, and } from 'drizzle-orm';

export const adminLogin = async (input: AdminLoginInput): Promise<User> => {
  try {
    // Check if credentials match hardcoded admin credentials
    if (input.username !== 'admin' || input.password !== 'admin') {
      throw new Error('Invalid admin credentials');
    }

    // Try to find existing admin user in database
    const adminUsers = await db.select()
      .from(usersTable)
      .where(
        and(
          eq(usersTable.username, 'admin'),
          eq(usersTable.is_admin, true)
        )
      )
      .execute();

    let adminUser;

    if (adminUsers.length === 0) {
      // Create admin user if doesn't exist
      const result = await db.insert(usersTable)
        .values({
          username: 'admin',
          email: 'admin@neon77.com',
          password_hash: 'admin_hash', // In real app, this would be properly hashed
          balance: '0.00',
          is_admin: true
        })
        .returning()
        .execute();

      adminUser = result[0];
    } else {
      adminUser = adminUsers[0];
    }

    // Convert numeric fields and return user data
    return {
      ...adminUser,
      balance: parseFloat(adminUser.balance)
    };
  } catch (error) {
    console.error('Admin login failed:', error);
    throw error;
  }
};