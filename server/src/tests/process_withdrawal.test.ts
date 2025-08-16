import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, withdrawalsTable } from '../db/schema';
import { type ProcessWithdrawalInput } from '../schema';
import { processWithdrawal } from '../handlers/process_withdrawal';
import { eq } from 'drizzle-orm';

describe('processWithdrawal', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test user
  const createTestUser = async (balance: number = 1000) => {
    const users = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashed_password',
        balance: balance.toString(),
        is_admin: false
      })
      .returning()
      .execute();
    return users[0];
  };

  // Helper function to create test withdrawal
  const createTestWithdrawal = async (userId: number, amount: number = 100) => {
    const withdrawals = await db.insert(withdrawalsTable)
      .values({
        user_id: userId,
        amount: amount.toString(),
        bank_name: 'Test Bank',
        account_number: '1234567890',
        account_holder_name: 'Test User',
        status: 'PENDING'
      })
      .returning()
      .execute();
    return withdrawals[0];
  };

  it('should approve withdrawal and deduct from user balance', async () => {
    // Create test user with sufficient balance
    const user = await createTestUser(1000);
    const withdrawal = await createTestWithdrawal(user.id, 100);

    const input: ProcessWithdrawalInput = {
      withdrawal_id: withdrawal.id,
      status: 'APPROVED',
      admin_notes: 'Approved by admin'
    };

    const result = await processWithdrawal(input);

    // Verify withdrawal was updated
    expect(result.id).toBe(withdrawal.id);
    expect(result.status).toBe('APPROVED');
    expect(result.admin_notes).toBe('Approved by admin');
    expect(result.amount).toBe(100);
    expect(typeof result.amount).toBe('number');
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify withdrawal in database
    const updatedWithdrawals = await db.select()
      .from(withdrawalsTable)
      .where(eq(withdrawalsTable.id, withdrawal.id))
      .execute();

    expect(updatedWithdrawals).toHaveLength(1);
    expect(updatedWithdrawals[0].status).toBe('APPROVED');
    expect(updatedWithdrawals[0].admin_notes).toBe('Approved by admin');

    // Verify user balance was deducted
    const updatedUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, user.id))
      .execute();

    expect(updatedUsers).toHaveLength(1);
    expect(parseFloat(updatedUsers[0].balance)).toBe(900); // 1000 - 100
  });

  it('should reject withdrawal without affecting user balance', async () => {
    // Create test user
    const user = await createTestUser(1000);
    const withdrawal = await createTestWithdrawal(user.id, 100);

    const input: ProcessWithdrawalInput = {
      withdrawal_id: withdrawal.id,
      status: 'REJECTED',
      admin_notes: 'Rejected due to policy violation'
    };

    const result = await processWithdrawal(input);

    // Verify withdrawal was updated
    expect(result.id).toBe(withdrawal.id);
    expect(result.status).toBe('REJECTED');
    expect(result.admin_notes).toBe('Rejected due to policy violation');
    expect(result.amount).toBe(100);

    // Verify user balance was not changed
    const updatedUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, user.id))
      .execute();

    expect(updatedUsers).toHaveLength(1);
    expect(parseFloat(updatedUsers[0].balance)).toBe(1000); // Balance unchanged
  });

  it('should process withdrawal without admin notes', async () => {
    const user = await createTestUser(500);
    const withdrawal = await createTestWithdrawal(user.id, 200);

    const input: ProcessWithdrawalInput = {
      withdrawal_id: withdrawal.id,
      status: 'APPROVED'
      // No admin_notes provided
    };

    const result = await processWithdrawal(input);

    expect(result.status).toBe('APPROVED');
    expect(result.admin_notes).toBeNull();
  });

  it('should throw error if withdrawal not found', async () => {
    const input: ProcessWithdrawalInput = {
      withdrawal_id: 99999,
      status: 'APPROVED'
    };

    await expect(processWithdrawal(input)).rejects.toThrow(/withdrawal not found/i);
  });

  it('should throw error if withdrawal already processed', async () => {
    const user = await createTestUser(1000);
    const withdrawal = await createTestWithdrawal(user.id, 100);

    // First, approve the withdrawal
    const firstInput: ProcessWithdrawalInput = {
      withdrawal_id: withdrawal.id,
      status: 'APPROVED'
    };
    await processWithdrawal(firstInput);

    // Try to process again
    const secondInput: ProcessWithdrawalInput = {
      withdrawal_id: withdrawal.id,
      status: 'REJECTED'
    };

    await expect(processWithdrawal(secondInput)).rejects.toThrow(/already been processed/i);
  });

  it('should throw error if user has insufficient balance', async () => {
    const user = await createTestUser(50); // Less than withdrawal amount
    const withdrawal = await createTestWithdrawal(user.id, 100);

    const input: ProcessWithdrawalInput = {
      withdrawal_id: withdrawal.id,
      status: 'APPROVED'
    };

    await expect(processWithdrawal(input)).rejects.toThrow(/insufficient balance/i);
  });

  it('should handle large withdrawal amounts correctly', async () => {
    const user = await createTestUser(10000.50); // Large balance with decimals
    const withdrawal = await createTestWithdrawal(user.id, 9999.99);

    const input: ProcessWithdrawalInput = {
      withdrawal_id: withdrawal.id,
      status: 'APPROVED',
      admin_notes: 'Large withdrawal approved'
    };

    const result = await processWithdrawal(input);

    expect(result.status).toBe('APPROVED');
    expect(result.amount).toBe(9999.99);

    // Verify precise balance calculation
    const updatedUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, user.id))
      .execute();

    expect(parseFloat(updatedUsers[0].balance)).toBeCloseTo(0.51, 2); // 10000.50 - 9999.99 = 0.51
  });

  it('should handle exact balance withdrawal', async () => {
    const user = await createTestUser(250); // Exact amount
    const withdrawal = await createTestWithdrawal(user.id, 250);

    const input: ProcessWithdrawalInput = {
      withdrawal_id: withdrawal.id,
      status: 'APPROVED'
    };

    const result = await processWithdrawal(input);

    expect(result.status).toBe('APPROVED');

    // Verify user balance is exactly 0
    const updatedUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, user.id))
      .execute();

    expect(parseFloat(updatedUsers[0].balance)).toBe(0);
  });
});