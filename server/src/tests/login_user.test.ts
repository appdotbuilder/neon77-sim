import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginUserInput } from '../schema';
import { loginUser } from '../handlers/login_user';
import { pbkdf2Sync, randomBytes } from 'crypto';

// Helper function to hash password using PBKDF2 (same as handler)
const hashPassword = (password: string, salt: string): string => {
  return pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
};

// Helper function to create password hash with salt
const createPasswordHash = (password: string): string => {
  const salt = randomBytes(32).toString('hex');
  const hash = hashPassword(password, salt);
  return `${salt}:${hash}`;
};

describe('loginUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create a test user
  const createTestUser = async (username = 'testuser', password = 'password123', isAdmin = false) => {
    const passwordHash = createPasswordHash(password);
    const result = await db.insert(usersTable)
      .values({
        username,
        email: `${username}@example.com`,
        password_hash: passwordHash,
        balance: '100.50',
        is_admin: isAdmin
      })
      .returning()
      .execute();

    return result[0];
  };

  it('should successfully login with valid credentials', async () => {
    // Create test user
    const testUser = await createTestUser('johndoe', 'securepass123');

    const loginInput: LoginUserInput = {
      username: 'johndoe',
      password: 'securepass123'
    };

    const result = await loginUser(loginInput);

    // Verify user data is returned correctly
    expect(result.id).toEqual(testUser.id);
    expect(result.username).toEqual('johndoe');
    expect(result.email).toEqual('johndoe@example.com');
    expect(result.balance).toEqual(100.50);
    expect(typeof result.balance).toEqual('number'); // Verify numeric conversion
    expect(result.is_admin).toEqual(false);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    
    // Password hash should still be present (for API layer to filter out)
    expect(result.password_hash).toBeDefined();
  });

  it('should successfully login admin user', async () => {
    // Create admin user
    await createTestUser('admin', 'adminpass123', true);

    const loginInput: LoginUserInput = {
      username: 'admin',
      password: 'adminpass123'
    };

    const result = await loginUser(loginInput);

    expect(result.username).toEqual('admin');
    expect(result.is_admin).toEqual(true);
  });

  it('should fail login with invalid username', async () => {
    // Create test user
    await createTestUser('validuser', 'validpass123');

    const loginInput: LoginUserInput = {
      username: 'nonexistentuser',
      password: 'validpass123'
    };

    await expect(loginUser(loginInput)).rejects.toThrow(/invalid username or password/i);
  });

  it('should fail login with invalid password', async () => {
    // Create test user
    await createTestUser('validuser', 'correctpass123');

    const loginInput: LoginUserInput = {
      username: 'validuser',
      password: 'wrongpass123'
    };

    await expect(loginUser(loginInput)).rejects.toThrow(/invalid username or password/i);
  });

  it('should handle user with zero balance correctly', async () => {
    // Create user with zero balance
    const passwordHash = createPasswordHash('password123');
    await db.insert(usersTable)
      .values({
        username: 'zerobalance',
        email: 'zero@example.com',
        password_hash: passwordHash,
        balance: '0.00',
        is_admin: false
      })
      .execute();

    const loginInput: LoginUserInput = {
      username: 'zerobalance',
      password: 'password123'
    };

    const result = await loginUser(loginInput);

    expect(result.balance).toEqual(0);
    expect(typeof result.balance).toEqual('number');
  });

  it('should handle user with large balance correctly', async () => {
    // Create user with large balance
    const passwordHash = createPasswordHash('password123');
    await db.insert(usersTable)
      .values({
        username: 'richuser',
        email: 'rich@example.com',
        password_hash: passwordHash,
        balance: '9999999.99',
        is_admin: false
      })
      .execute();

    const loginInput: LoginUserInput = {
      username: 'richuser',
      password: 'password123'
    };

    const result = await loginUser(loginInput);

    expect(result.balance).toEqual(9999999.99);
    expect(typeof result.balance).toEqual('number');
  });

  it('should be case sensitive for username', async () => {
    // Create test user
    await createTestUser('CaseSensitive', 'password123');

    const loginInput: LoginUserInput = {
      username: 'casesensitive', // lowercase
      password: 'password123'
    };

    await expect(loginUser(loginInput)).rejects.toThrow(/invalid username or password/i);
  });

  it('should handle special characters in password correctly', async () => {
    // Create user with special characters in password
    await createTestUser('specialuser', 'p@ss!w0rd#$%');

    const loginInput: LoginUserInput = {
      username: 'specialuser',
      password: 'p@ss!w0rd#$%'
    };

    const result = await loginUser(loginInput);

    expect(result.username).toEqual('specialuser');
  });

  it('should fail with malformed password hash', async () => {
    // Create user with malformed password hash (missing salt separator)
    await db.insert(usersTable)
      .values({
        username: 'malformeduser',
        email: 'malformed@example.com',
        password_hash: 'invalid_hash_format',
        balance: '0.00',
        is_admin: false
      })
      .execute();

    const loginInput: LoginUserInput = {
      username: 'malformeduser',
      password: 'anypassword'
    };

    await expect(loginUser(loginInput)).rejects.toThrow(/invalid username or password/i);
  });
});