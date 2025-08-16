import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type RegisterUserInput } from '../schema';
import { registerUser } from '../handlers/register_user';
import { eq, or } from 'drizzle-orm';

// Test input
const testInput: RegisterUserInput = {
  username: 'testuser',
  email: 'test@example.com',
  password: 'password123'
};

describe('registerUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should register a new user', async () => {
    const result = await registerUser(testInput);

    // Basic field validation
    expect(result.username).toEqual('testuser');
    expect(result.email).toEqual('test@example.com');
    expect(result.balance).toEqual(0);
    expect(result.is_admin).toBe(false);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.password_hash).toBeDefined();
    expect(result.password_hash.length).toBeGreaterThan(0);
    expect(typeof result.balance).toBe('number');
  });

  it('should save user to database', async () => {
    const result = await registerUser(testInput);

    // Query database to verify user was saved
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].username).toEqual('testuser');
    expect(users[0].email).toEqual('test@example.com');
    expect(parseFloat(users[0].balance)).toEqual(0);
    expect(users[0].is_admin).toBe(false);
    expect(users[0].password_hash).toBeDefined();
    expect(users[0].created_at).toBeInstanceOf(Date);
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should hash the password', async () => {
    const result = await registerUser(testInput);

    // Password should be hashed, not stored in plain text
    expect(result.password_hash).not.toEqual('password123');
    expect(result.password_hash.length).toBeGreaterThan(20); // Hashed password should be longer
    
    // Verify in database as well
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users[0].password_hash).not.toEqual('password123');
    expect(users[0].password_hash).toEqual(result.password_hash);
  });

  it('should throw error if username already exists', async () => {
    // Create first user
    await registerUser(testInput);

    // Try to create user with same username but different email
    const duplicateUsernameInput: RegisterUserInput = {
      username: 'testuser', // Same username
      email: 'different@example.com',
      password: 'password456'
    };

    await expect(registerUser(duplicateUsernameInput)).rejects.toThrow(/username already exists/i);
  });

  it('should throw error if email already exists', async () => {
    // Create first user
    await registerUser(testInput);

    // Try to create user with same email but different username
    const duplicateEmailInput: RegisterUserInput = {
      username: 'differentuser',
      email: 'test@example.com', // Same email
      password: 'password456'
    };

    await expect(registerUser(duplicateEmailInput)).rejects.toThrow(/email already exists/i);
  });

  it('should create multiple users with unique credentials', async () => {
    // Create first user
    const user1 = await registerUser(testInput);

    // Create second user with different credentials
    const secondInput: RegisterUserInput = {
      username: 'user2',
      email: 'user2@example.com',
      password: 'password456'
    };
    
    const user2 = await registerUser(secondInput);

    // Both users should be created successfully
    expect(user1.id).not.toEqual(user2.id);
    expect(user1.username).not.toEqual(user2.username);
    expect(user1.email).not.toEqual(user2.email);
    expect(user1.password_hash).not.toEqual(user2.password_hash);

    // Verify both exist in database
    const allUsers = await db.select()
      .from(usersTable)
      .execute();

    expect(allUsers).toHaveLength(2);
    expect(allUsers.map(u => u.username).sort()).toEqual(['testuser', 'user2']);
  });

  it('should set default values correctly', async () => {
    const result = await registerUser(testInput);

    // Check all default values
    expect(result.balance).toEqual(0);
    expect(result.is_admin).toBe(false);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify created_at and updated_at are recent (within last minute)
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    
    expect(result.created_at > oneMinuteAgo).toBe(true);
    expect(result.updated_at > oneMinuteAgo).toBe(true);
  });

  it('should query users by multiple conditions correctly', async () => {
    // Create test users
    await registerUser(testInput);
    await registerUser({
      username: 'admin',
      email: 'admin@example.com',
      password: 'adminpass'
    });

    // Test querying with OR conditions
    const users = await db.select()
      .from(usersTable)
      .where(
        or(
          eq(usersTable.username, 'testuser'),
          eq(usersTable.email, 'admin@example.com')
        )
      )
      .execute();

    expect(users).toHaveLength(2);
    expect(users.map(u => u.username).sort()).toEqual(['admin', 'testuser']);
    
    // Verify numeric field conversion
    users.forEach(user => {
      expect(typeof parseFloat(user.balance)).toBe('number');
      expect(parseFloat(user.balance)).toEqual(0);
    });
  });
});