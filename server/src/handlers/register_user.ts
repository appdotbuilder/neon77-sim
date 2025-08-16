import { db } from '../db';
import { usersTable } from '../db/schema';
import { type RegisterUserInput, type User } from '../schema';
import { eq, or } from 'drizzle-orm';

export const registerUser = async (input: RegisterUserInput): Promise<User> => {
  try {
    // Check if username or email already exists
    const existingUsers = await db.select()
      .from(usersTable)
      .where(
        or(
          eq(usersTable.username, input.username),
          eq(usersTable.email, input.email)
        )
      )
      .execute();

    if (existingUsers.length > 0) {
      const existingUser = existingUsers[0];
      if (existingUser.username === input.username) {
        throw new Error('Username already exists');
      }
      if (existingUser.email === input.email) {
        throw new Error('Email already exists');
      }
    }

    // Hash the password (simple implementation - in production use bcrypt or similar)
    const passwordHash = await hashPassword(input.password);

    // Insert new user record
    const result = await db.insert(usersTable)
      .values({
        username: input.username,
        email: input.email,
        password_hash: passwordHash,
        balance: '0.00', // Convert number to string for numeric column
        is_admin: false
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const user = result[0];
    return {
      ...user,
      balance: parseFloat(user.balance) // Convert string back to number
    };
  } catch (error) {
    console.error('User registration failed:', error);
    throw error;
  }
};

// Simple password hashing function (in production, use bcrypt or similar)
async function hashPassword(password: string): Promise<string> {
  // Using built-in crypto for simple hashing (not suitable for production)
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'salt');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}