import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, withdrawalsTable } from '../db/schema';
import { type CreateWithdrawalInput } from '../schema';
import { createWithdrawal } from '../handlers/create_withdrawal';
import { eq } from 'drizzle-orm';

// Test input for withdrawal creation
const testInput: CreateWithdrawalInput = {
  user_id: 1,
  amount: 50.00,
  bank_name: 'Bank Central Asia',
  account_number: '1234567890',
  account_holder_name: 'John Doe'
};

describe('createWithdrawal', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a withdrawal request successfully', async () => {
    // Create a user with sufficient balance first
    await db.insert(usersTable).values({
      username: 'testuser',
      email: 'test@example.com',
      password_hash: 'hashed_password_123',
      balance: '100.00', // Sufficient balance
      is_admin: false
    }).execute();

    const result = await createWithdrawal(testInput);

    // Basic field validation
    expect(result.user_id).toEqual(1);
    expect(result.amount).toEqual(50.00);
    expect(typeof result.amount).toBe('number');
    expect(result.bank_name).toEqual('Bank Central Asia');
    expect(result.account_number).toEqual('1234567890');
    expect(result.account_holder_name).toEqual('John Doe');
    expect(result.status).toEqual('PENDING');
    expect(result.admin_notes).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save withdrawal to database', async () => {
    // Create a user with sufficient balance first
    await db.insert(usersTable).values({
      username: 'testuser',
      email: 'test@example.com',
      password_hash: 'hashed_password_123',
      balance: '100.00',
      is_admin: false
    }).execute();

    const result = await createWithdrawal(testInput);

    // Query the database to verify the withdrawal was saved
    const withdrawals = await db.select()
      .from(withdrawalsTable)
      .where(eq(withdrawalsTable.id, result.id))
      .execute();

    expect(withdrawals).toHaveLength(1);
    const withdrawal = withdrawals[0];
    expect(withdrawal.user_id).toEqual(1);
    expect(parseFloat(withdrawal.amount)).toEqual(50.00);
    expect(withdrawal.bank_name).toEqual('Bank Central Asia');
    expect(withdrawal.account_number).toEqual('1234567890');
    expect(withdrawal.account_holder_name).toEqual('John Doe');
    expect(withdrawal.status).toEqual('PENDING');
    expect(withdrawal.admin_notes).toBeNull();
    expect(withdrawal.created_at).toBeInstanceOf(Date);
    expect(withdrawal.updated_at).toBeInstanceOf(Date);
  });

  it('should fail when user does not exist', async () => {
    // Don't create any user - test with non-existent user_id
    const invalidInput = {
      ...testInput,
      user_id: 999
    };

    await expect(createWithdrawal(invalidInput)).rejects.toThrow(/User with ID 999 not found/i);
  });

  it('should fail when user has insufficient balance', async () => {
    // Create a user with insufficient balance
    await db.insert(usersTable).values({
      username: 'pooruser',
      email: 'poor@example.com',
      password_hash: 'hashed_password_123',
      balance: '25.00', // Insufficient balance for 50.00 withdrawal
      is_admin: false
    }).execute();

    await expect(createWithdrawal(testInput)).rejects.toThrow(/Insufficient balance/i);
  });

  it('should work with exact balance amount', async () => {
    // Create a user with exact balance needed
    await db.insert(usersTable).values({
      username: 'exactuser',
      email: 'exact@example.com',
      password_hash: 'hashed_password_123',
      balance: '50.00', // Exact amount needed
      is_admin: false
    }).execute();

    const result = await createWithdrawal(testInput);

    expect(result.user_id).toEqual(1);
    expect(result.amount).toEqual(50.00);
    expect(result.status).toEqual('PENDING');
  });

  it('should handle decimal amounts correctly', async () => {
    // Create a user with sufficient balance
    await db.insert(usersTable).values({
      username: 'decimaluser',
      email: 'decimal@example.com',
      password_hash: 'hashed_password_123',
      balance: '100.50',
      is_admin: false
    }).execute();

    const decimalInput: CreateWithdrawalInput = {
      user_id: 1,
      amount: 75.25,
      bank_name: 'Test Bank',
      account_number: '9876543210',
      account_holder_name: 'Jane Doe'
    };

    const result = await createWithdrawal(decimalInput);

    expect(result.amount).toEqual(75.25);
    expect(typeof result.amount).toBe('number');

    // Verify in database
    const withdrawals = await db.select()
      .from(withdrawalsTable)
      .where(eq(withdrawalsTable.id, result.id))
      .execute();

    expect(parseFloat(withdrawals[0].amount)).toEqual(75.25);
  });

  it('should handle large withdrawal amounts correctly', async () => {
    // Create a user with large balance
    await db.insert(usersTable).values({
      username: 'richuser',
      email: 'rich@example.com',
      password_hash: 'hashed_password_123',
      balance: '10000.00',
      is_admin: false
    }).execute();

    const largeInput: CreateWithdrawalInput = {
      user_id: 1,
      amount: 5000.99,
      bank_name: 'Premier Bank',
      account_number: '1111222233',
      account_holder_name: 'Rich Person'
    };

    const result = await createWithdrawal(largeInput);

    expect(result.amount).toEqual(5000.99);
    expect(result.bank_name).toEqual('Premier Bank');
    expect(result.account_number).toEqual('1111222233');
    expect(result.account_holder_name).toEqual('Rich Person');
  });
});