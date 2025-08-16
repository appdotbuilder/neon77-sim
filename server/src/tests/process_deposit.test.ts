import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { depositsTable, usersTable } from '../db/schema';
import { type ProcessDepositInput } from '../schema';
import { processDeposit } from '../handlers/process_deposit';
import { eq } from 'drizzle-orm';


describe('processDeposit', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test user
  const createTestUser = async (balance: string = '100.00') => {
    const users = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashed_password_123',
        balance: balance
      })
      .returning()
      .execute();
    return users[0];
  };

  // Helper function to create test deposit
  const createTestDeposit = async (userId: number, amount: string = '50.00') => {
    const deposits = await db.insert(depositsTable)
      .values({
        user_id: userId,
        amount: amount,
        payment_method: 'QRIS',
        proof_image_url: 'https://example.com/proof.jpg',
        status: 'PENDING'
      })
      .returning()
      .execute();
    return deposits[0];
  };

  it('should approve deposit and update user balance', async () => {
    // Create test user and deposit
    const user = await createTestUser('100.00');
    const deposit = await createTestDeposit(user.id, '50.00');

    const input: ProcessDepositInput = {
      deposit_id: deposit.id,
      status: 'APPROVED',
      admin_notes: 'Deposit approved successfully',
      admin_response_image_url: 'https://example.com/confirmation.jpg'
    };

    const result = await processDeposit(input);

    // Verify deposit update
    expect(result.id).toBe(deposit.id);
    expect(result.status).toBe('APPROVED');
    expect(result.admin_notes).toBe('Deposit approved successfully');
    expect(result.admin_response_image_url).toBe('https://example.com/confirmation.jpg');
    expect(result.amount).toBe(50.00);
    expect(typeof result.amount).toBe('number');
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify user balance was updated
    const updatedUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, user.id))
      .execute();

    expect(updatedUsers).toHaveLength(1);
    expect(parseFloat(updatedUsers[0].balance)).toBe(150.00); // 100 + 50
  });

  it('should reject deposit without updating user balance', async () => {
    // Create test user and deposit
    const user = await createTestUser('100.00');
    const deposit = await createTestDeposit(user.id, '50.00');

    const input: ProcessDepositInput = {
      deposit_id: deposit.id,
      status: 'REJECTED',
      admin_notes: 'Invalid proof image'
    };

    const result = await processDeposit(input);

    // Verify deposit update
    expect(result.id).toBe(deposit.id);
    expect(result.status).toBe('REJECTED');
    expect(result.admin_notes).toBe('Invalid proof image');
    expect(result.admin_response_image_url).toBeNull();
    expect(result.amount).toBe(50.00);
    expect(typeof result.amount).toBe('number');

    // Verify user balance was NOT updated
    const updatedUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, user.id))
      .execute();

    expect(updatedUsers).toHaveLength(1);
    expect(parseFloat(updatedUsers[0].balance)).toBe(100.00); // Unchanged
  });

  it('should process deposit with minimal input', async () => {
    // Create test user and deposit
    const user = await createTestUser('200.00');
    const deposit = await createTestDeposit(user.id, '75.50');

    const input: ProcessDepositInput = {
      deposit_id: deposit.id,
      status: 'APPROVED'
    };

    const result = await processDeposit(input);

    // Verify deposit update with minimal data
    expect(result.id).toBe(deposit.id);
    expect(result.status).toBe('APPROVED');
    expect(result.admin_notes).toBeNull();
    expect(result.admin_response_image_url).toBeNull();
    expect(result.amount).toBe(75.50);

    // Verify user balance was updated correctly
    const updatedUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, user.id))
      .execute();

    expect(updatedUsers).toHaveLength(1);
    expect(parseFloat(updatedUsers[0].balance)).toBe(275.50); // 200 + 75.50
  });

  it('should handle large deposit amounts correctly', async () => {
    // Create test user and deposit with large amount
    const user = await createTestUser('1000.00');
    const deposit = await createTestDeposit(user.id, '9999.99');

    const input: ProcessDepositInput = {
      deposit_id: deposit.id,
      status: 'APPROVED',
      admin_notes: 'Large deposit approved'
    };

    const result = await processDeposit(input);

    expect(result.amount).toBe(9999.99);
    expect(typeof result.amount).toBe('number');

    // Verify user balance calculation with large numbers
    const updatedUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, user.id))
      .execute();

    expect(parseFloat(updatedUsers[0].balance)).toBe(10999.99); // 1000 + 9999.99
  });

  it('should throw error for non-existent deposit', async () => {
    const input: ProcessDepositInput = {
      deposit_id: 99999,
      status: 'APPROVED'
    };

    await expect(processDeposit(input)).rejects.toThrow(/Deposit with ID 99999 not found/i);
  });

  it('should throw error for already processed deposit', async () => {
    // Create test user and deposit
    const user = await createTestUser();
    const deposit = await createTestDeposit(user.id);

    // First, approve the deposit
    await processDeposit({
      deposit_id: deposit.id,
      status: 'APPROVED'
    });

    // Try to process it again
    const input: ProcessDepositInput = {
      deposit_id: deposit.id,
      status: 'REJECTED'
    };

    await expect(processDeposit(input)).rejects.toThrow(/has already been processed/i);
  });

  it('should update deposit in database correctly', async () => {
    // Create test user and deposit
    const user = await createTestUser('50.00');
    const deposit = await createTestDeposit(user.id, '25.25');

    const input: ProcessDepositInput = {
      deposit_id: deposit.id,
      status: 'APPROVED',
      admin_notes: 'Verified and approved',
      admin_response_image_url: 'https://example.com/admin_response.jpg'
    };

    await processDeposit(input);

    // Query database directly to verify changes
    const updatedDeposits = await db.select()
      .from(depositsTable)
      .where(eq(depositsTable.id, deposit.id))
      .execute();

    expect(updatedDeposits).toHaveLength(1);
    const updatedDeposit = updatedDeposits[0];

    expect(updatedDeposit.status).toBe('APPROVED');
    expect(updatedDeposit.admin_notes).toBe('Verified and approved');
    expect(updatedDeposit.admin_response_image_url).toBe('https://example.com/admin_response.jpg');
    expect(parseFloat(updatedDeposit.amount)).toBe(25.25);
    expect(updatedDeposit.updated_at).toBeInstanceOf(Date);
    
    // Verify updated_at is actually updated (should be different from created_at)
    expect(updatedDeposit.updated_at.getTime()).toBeGreaterThanOrEqual(updatedDeposit.created_at.getTime());
  });
});