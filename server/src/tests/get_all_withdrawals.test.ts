import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, withdrawalsTable } from '../db/schema';
import { getAllWithdrawals } from '../handlers/get_all_withdrawals';
import { eq } from 'drizzle-orm';

// Test data
const testUser1 = {
  username: 'testuser1',
  email: 'test1@example.com',
  password_hash: 'hashedpassword1',
  balance: '1000.00',
  is_admin: false
};

const testUser2 = {
  username: 'testuser2', 
  email: 'test2@example.com',
  password_hash: 'hashedpassword2',
  balance: '2000.00',
  is_admin: false
};

describe('getAllWithdrawals', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no withdrawals exist', async () => {
    const result = await getAllWithdrawals();
    expect(result).toEqual([]);
  });

  it('should return all withdrawals ordered by created_at descending', async () => {
    // Create test users first
    const [user1, user2] = await db.insert(usersTable)
      .values([testUser1, testUser2])
      .returning()
      .execute();

    // Create withdrawals with different timestamps
    const withdrawal1Data = {
      user_id: user1.id,
      amount: '500.00',
      bank_name: 'Bank A',
      account_number: '1234567890',
      account_holder_name: 'User One',
      status: 'PENDING' as const
    };

    const withdrawal2Data = {
      user_id: user2.id,
      amount: '750.50',
      bank_name: 'Bank B', 
      account_number: '0987654321',
      account_holder_name: 'User Two',
      status: 'APPROVED' as const
    };

    // Insert first withdrawal
    await db.insert(withdrawalsTable)
      .values(withdrawal1Data)
      .execute();

    // Wait a moment to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    // Insert second withdrawal (should be more recent)
    await db.insert(withdrawalsTable)
      .values(withdrawal2Data)
      .execute();

    const result = await getAllWithdrawals();

    expect(result).toHaveLength(2);
    
    // Should be ordered by created_at descending (most recent first)
    expect(result[0].user_id).toEqual(user2.id);
    expect(result[0].amount).toEqual(750.50);
    expect(result[0].bank_name).toEqual('Bank B');
    expect(result[0].account_number).toEqual('0987654321');
    expect(result[0].account_holder_name).toEqual('User Two');
    expect(result[0].status).toEqual('APPROVED');
    expect(typeof result[0].amount).toBe('number');

    expect(result[1].user_id).toEqual(user1.id);
    expect(result[1].amount).toEqual(500.00);
    expect(result[1].bank_name).toEqual('Bank A');
    expect(result[1].account_number).toEqual('1234567890');
    expect(result[1].account_holder_name).toEqual('User One');
    expect(result[1].status).toEqual('PENDING');
    expect(typeof result[1].amount).toBe('number');

    // Verify both have proper date fields
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
    expect(result[1].created_at).toBeInstanceOf(Date);
    expect(result[1].updated_at).toBeInstanceOf(Date);
  });

  it('should include all withdrawal fields correctly', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values(testUser1)
      .returning()
      .execute();

    const withdrawalData = {
      user_id: user.id,
      amount: '1234.56',
      bank_name: 'Test Bank',
      account_number: '1111222233334444',
      account_holder_name: 'Test User Account',
      status: 'REJECTED' as const,
      admin_notes: 'Test admin notes'
    };

    await db.insert(withdrawalsTable)
      .values(withdrawalData)
      .execute();

    const result = await getAllWithdrawals();

    expect(result).toHaveLength(1);
    const withdrawal = result[0];

    expect(withdrawal.id).toBeDefined();
    expect(withdrawal.user_id).toEqual(user.id);
    expect(withdrawal.amount).toEqual(1234.56);
    expect(withdrawal.bank_name).toEqual('Test Bank');
    expect(withdrawal.account_number).toEqual('1111222233334444');
    expect(withdrawal.account_holder_name).toEqual('Test User Account');
    expect(withdrawal.status).toEqual('REJECTED');
    expect(withdrawal.admin_notes).toEqual('Test admin notes');
    expect(withdrawal.created_at).toBeInstanceOf(Date);
    expect(withdrawal.updated_at).toBeInstanceOf(Date);
  });

  it('should handle withdrawals with null admin_notes', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values(testUser1)
      .returning()
      .execute();

    const withdrawalData = {
      user_id: user.id,
      amount: '100.00',
      bank_name: 'Test Bank',
      account_number: '1234567890',
      account_holder_name: 'Test User',
      status: 'PENDING' as const
      // admin_notes omitted (will be null)
    };

    await db.insert(withdrawalsTable)
      .values(withdrawalData)
      .execute();

    const result = await getAllWithdrawals();

    expect(result).toHaveLength(1);
    expect(result[0].admin_notes).toBeNull();
  });

  it('should work correctly when joining with users table', async () => {
    // Create test user  
    const [user] = await db.insert(usersTable)
      .values(testUser1)
      .returning()
      .execute();

    // Create withdrawal
    await db.insert(withdrawalsTable)
      .values({
        user_id: user.id,
        amount: '500.00',
        bank_name: 'Test Bank',
        account_number: '1234567890',
        account_holder_name: 'Test User',
        status: 'PENDING' as const
      })
      .execute();

    const result = await getAllWithdrawals();

    expect(result).toHaveLength(1);
    expect(result[0].user_id).toEqual(user.id);
    
    // Verify the user still exists in database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, user.id))
      .execute();
    
    expect(users).toHaveLength(1);
    expect(users[0].username).toEqual('testuser1');
  });
});