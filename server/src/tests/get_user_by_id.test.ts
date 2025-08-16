import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type GetUserByIdInput } from '../schema';
import { getUserById } from '../handlers/get_user_by_id';

// Test user data
const testUser = {
  username: 'testuser',
  email: 'test@example.com',
  password_hash: '$2a$10$hashedpassword123', // Mock hashed password
  balance: '150.75', // String for numeric column
  is_admin: false
};

const testAdminUser = {
  username: 'adminuser',
  email: 'admin@example.com',
  password_hash: '$2a$10$hashedadminpass456', // Mock hashed password
  balance: '1000.00', // String for numeric column
  is_admin: true
};

describe('getUserById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should get user by ID successfully', async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const createdUser = users[0];
    const input: GetUserByIdInput = { user_id: createdUser.id };

    const result = await getUserById(input);

    // Verify all fields are returned correctly
    expect(result.id).toBe(createdUser.id);
    expect(result.username).toBe('testuser');
    expect(result.email).toBe('test@example.com');
    expect(result.password_hash).toBeDefined(); // Password hash should be included
    expect(typeof result.balance).toBe('number'); // Should be converted to number
    expect(result.balance).toBe(150.75);
    expect(result.is_admin).toBe(false);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should get admin user by ID successfully', async () => {
    // Create test admin user
    const users = await db.insert(usersTable)
      .values(testAdminUser)
      .returning()
      .execute();

    const createdUser = users[0];
    const input: GetUserByIdInput = { user_id: createdUser.id };

    const result = await getUserById(input);

    expect(result.id).toBe(createdUser.id);
    expect(result.username).toBe('adminuser');
    expect(result.email).toBe('admin@example.com');
    expect(result.balance).toBe(1000.00);
    expect(result.is_admin).toBe(true);
  });

  it('should handle zero balance correctly', async () => {
    // Create user with zero balance
    const zeroBalanceUser = {
      ...testUser,
      balance: '0.00'
    };

    const users = await db.insert(usersTable)
      .values(zeroBalanceUser)
      .returning()
      .execute();

    const createdUser = users[0];
    const input: GetUserByIdInput = { user_id: createdUser.id };

    const result = await getUserById(input);

    expect(result.balance).toBe(0.00);
    expect(typeof result.balance).toBe('number');
  });

  it('should handle large balance amounts correctly', async () => {
    // Create user with large balance
    const largeBalanceUser = {
      ...testUser,
      balance: '99999.99'
    };

    const users = await db.insert(usersTable)
      .values(largeBalanceUser)
      .returning()
      .execute();

    const createdUser = users[0];
    const input: GetUserByIdInput = { user_id: createdUser.id };

    const result = await getUserById(input);

    expect(result.balance).toBe(99999.99);
    expect(typeof result.balance).toBe('number');
  });

  it('should throw error when user not found', async () => {
    const input: GetUserByIdInput = { user_id: 999 };

    await expect(getUserById(input)).rejects.toThrow(/user with id 999 not found/i);
  });

  it('should throw error for negative user ID', async () => {
    const input: GetUserByIdInput = { user_id: -1 };

    await expect(getUserById(input)).rejects.toThrow(/user with id -1 not found/i);
  });

  it('should verify database query returns correct user', async () => {
    // Create multiple test users
    const users = await db.insert(usersTable)
      .values([testUser, testAdminUser])
      .returning()
      .execute();

    const firstUser = users[0];
    const secondUser = users[1];

    // Get first user
    const input1: GetUserByIdInput = { user_id: firstUser.id };
    const result1 = await getUserById(input1);

    expect(result1.id).toBe(firstUser.id);
    expect(result1.username).toBe('testuser');
    expect(result1.is_admin).toBe(false);

    // Get second user
    const input2: GetUserByIdInput = { user_id: secondUser.id };
    const result2 = await getUserById(input2);

    expect(result2.id).toBe(secondUser.id);
    expect(result2.username).toBe('adminuser');
    expect(result2.is_admin).toBe(true);

    // Ensure we got different users
    expect(result1.id).not.toBe(result2.id);
    expect(result1.username).not.toBe(result2.username);
  });
});