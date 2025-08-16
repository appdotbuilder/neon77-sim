import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, withdrawalsTable } from '../db/schema';
import { type GetUserWithdrawalsInput } from '../schema';
import { getUserWithdrawals } from '../handlers/get_user_withdrawals';

describe('getUserWithdrawals', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when user has no withdrawals', async () => {
    // Create test user without withdrawals
    const [user] = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword'
      })
      .returning()
      .execute();

    const input: GetUserWithdrawalsInput = {
      user_id: user.id
    };

    const result = await getUserWithdrawals(input);

    expect(result).toEqual([]);
  });

  it('should return user withdrawals ordered by created_at desc', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword'
      })
      .returning()
      .execute();

    // Create withdrawals with different timestamps
    const now = new Date();
    const earlier = new Date(now.getTime() - 60000); // 1 minute ago
    const later = new Date(now.getTime() + 60000); // 1 minute from now

    const withdrawals = await db.insert(withdrawalsTable)
      .values([
        {
          user_id: user.id,
          amount: '100.00',
          bank_name: 'Bank A',
          account_number: '1234567890',
          account_holder_name: 'Test User',
          status: 'PENDING',
          created_at: earlier,
          updated_at: earlier
        },
        {
          user_id: user.id,
          amount: '200.50',
          bank_name: 'Bank B',
          account_number: '0987654321',
          account_holder_name: 'Test User',
          status: 'APPROVED',
          created_at: later,
          updated_at: later
        },
        {
          user_id: user.id,
          amount: '50.75',
          bank_name: 'Bank C',
          account_number: '1111222233',
          account_holder_name: 'Test User',
          status: 'REJECTED',
          created_at: now,
          updated_at: now
        }
      ])
      .returning()
      .execute();

    const input: GetUserWithdrawalsInput = {
      user_id: user.id
    };

    const result = await getUserWithdrawals(input);

    // Should return 3 withdrawals
    expect(result).toHaveLength(3);

    // Should be ordered by created_at desc (most recent first)
    expect(result[0].created_at.getTime()).toBeGreaterThan(result[1].created_at.getTime());
    expect(result[1].created_at.getTime()).toBeGreaterThan(result[2].created_at.getTime());

    // Verify amounts are correctly converted to numbers
    expect(typeof result[0].amount).toBe('number');
    expect(typeof result[1].amount).toBe('number');
    expect(typeof result[2].amount).toBe('number');

    // Verify specific withdrawal data
    expect(result[0].amount).toBe(200.50);
    expect(result[0].bank_name).toBe('Bank B');
    expect(result[0].status).toBe('APPROVED');

    expect(result[1].amount).toBe(50.75);
    expect(result[1].bank_name).toBe('Bank C');
    expect(result[1].status).toBe('REJECTED');

    expect(result[2].amount).toBe(100.00);
    expect(result[2].bank_name).toBe('Bank A');
    expect(result[2].status).toBe('PENDING');
  });

  it('should only return withdrawals for the specified user', async () => {
    // Create two test users
    const [user1] = await db.insert(usersTable)
      .values({
        username: 'user1',
        email: 'user1@example.com',
        password_hash: 'hashedpassword1'
      })
      .returning()
      .execute();

    const [user2] = await db.insert(usersTable)
      .values({
        username: 'user2',
        email: 'user2@example.com',
        password_hash: 'hashedpassword2'
      })
      .returning()
      .execute();

    // Create withdrawals for both users
    await db.insert(withdrawalsTable)
      .values([
        {
          user_id: user1.id,
          amount: '100.00',
          bank_name: 'Bank A',
          account_number: '1234567890',
          account_holder_name: 'User One',
          status: 'PENDING'
        },
        {
          user_id: user1.id,
          amount: '150.25',
          bank_name: 'Bank B',
          account_number: '1111111111',
          account_holder_name: 'User One',
          status: 'APPROVED'
        },
        {
          user_id: user2.id,
          amount: '200.00',
          bank_name: 'Bank C',
          account_number: '2222222222',
          account_holder_name: 'User Two',
          status: 'REJECTED'
        }
      ])
      .execute();

    const input: GetUserWithdrawalsInput = {
      user_id: user1.id
    };

    const result = await getUserWithdrawals(input);

    // Should return only user1's withdrawals
    expect(result).toHaveLength(2);
    
    // Verify all results belong to user1
    result.forEach(withdrawal => {
      expect(withdrawal.user_id).toBe(user1.id);
    });

    // Verify amounts are converted correctly
    const amounts = result.map(w => w.amount).sort((a, b) => a - b);
    expect(amounts).toEqual([100.00, 150.25]);
  });

  it('should handle withdrawals with nullable fields correctly', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword'
      })
      .returning()
      .execute();

    // Create withdrawal with admin notes
    await db.insert(withdrawalsTable)
      .values({
        user_id: user.id,
        amount: '75.00',
        bank_name: 'Test Bank',
        account_number: '9876543210',
        account_holder_name: 'Test User',
        status: 'REJECTED',
        admin_notes: 'Insufficient balance verification'
      })
      .execute();

    const input: GetUserWithdrawalsInput = {
      user_id: user.id
    };

    const result = await getUserWithdrawals(input);

    expect(result).toHaveLength(1);
    expect(result[0].admin_notes).toBe('Insufficient balance verification');
    expect(result[0].amount).toBe(75.00);
    expect(typeof result[0].amount).toBe('number');
  });

  it('should return empty array for non-existent user', async () => {
    const input: GetUserWithdrawalsInput = {
      user_id: 99999 // Non-existent user ID
    };

    const result = await getUserWithdrawals(input);

    expect(result).toEqual([]);
  });
});