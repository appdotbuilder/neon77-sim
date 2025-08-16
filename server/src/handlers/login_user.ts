import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginUserInput, type User } from '../schema';
import { eq } from 'drizzle-orm';
import { createHash, pbkdf2Sync } from 'crypto';

// Helper function to hash password using PBKDF2
const hashPassword = (password: string, salt: string): string => {
  return pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
};

// Helper function to verify password
const verifyPassword = (password: string, hashedPassword: string): boolean => {
  // Extract salt from stored hash (format: salt:hash)
  const [salt, hash] = hashedPassword.split(':');
  if (!salt || !hash) {
    return false;
  }
  
  const computedHash = hashPassword(password, salt);
  return computedHash === hash;
};

export const loginUser = async (input: LoginUserInput): Promise<User> => {
  try {
    // Find user by username
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.username, input.username))
      .execute();

    if (users.length === 0) {
      throw new Error('Invalid username or password');
    }

    const user = users[0];

    // Verify password against stored hash
    const isValidPassword = verifyPassword(input.password, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Invalid username or password');
    }

    // Return user data with numeric fields properly converted
    return {
      ...user,
      balance: parseFloat(user.balance) // Convert numeric field to number
    };
  } catch (error) {
    console.error('User login failed:', error);
    throw error;
  }
};