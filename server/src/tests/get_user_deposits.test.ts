import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { depositsTable, usersTable } from '../db/schema';
import { type GetUserDepositsInput } from '../schema';
import { getUserDeposits } from '../handlers/get_user_deposits';

describe('getUserDeposits', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should get all deposits for a specific user', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          username: 'testuser1',
          email: 'user1@test.com',
          password_hash: 'hash1',
          balance: '100.00'
        },
        {
          username: 'testuser2',
          email: 'user2@test.com',
          password_hash: 'hash2',
          balance: '200.00'
        }
      ])
      .returning()
      .execute();

    const user1Id = users[0].id;
    const user2Id = users[1].id;

    // Create test deposits for both users
    const deposits = await db.insert(depositsTable)
      .values([
        {
          user_id: user1Id,
          amount: '50.00',
          payment_method: 'DANA',
          target_number: '081234567890',
          status: 'PENDING'
        },
        {
          user_id: user1Id,
          amount: '100.00',
          payment_method: 'OVO',
          target_number: '081234567891',
          status: 'APPROVED'
        },
        {
          user_id: user2Id,
          amount: '75.00',
          payment_method: 'GOPAY',
          target_number: '081234567892',
          status: 'PENDING'
        },
        {
          user_id: user1Id,
          amount: '25.00',
          payment_method: 'QRIS',
          proof_image_url: 'https://example.com/proof.jpg',
          status: 'REJECTED'
        }
      ])
      .returning()
      .execute();

    const input: GetUserDepositsInput = {
      user_id: user1Id
    };

    const result = await getUserDeposits(input);

    // Should return only user1's deposits (3 total)
    expect(result).toHaveLength(3);

    // Check that all returned deposits belong to the correct user
    result.forEach(deposit => {
      expect(deposit.user_id).toBe(user1Id);
    });

    // Verify numeric conversion
    result.forEach(deposit => {
      expect(typeof deposit.amount).toBe('number');
    });

    // Check specific amounts
    const amounts = result.map(deposit => deposit.amount);
    expect(amounts).toContain(50);
    expect(amounts).toContain(100);
    expect(amounts).toContain(25);

    // Should not contain user2's deposit
    expect(amounts).not.toContain(75);
  });

  it('should return deposits ordered by created_at descending', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'user@test.com',
        password_hash: 'hash',
        balance: '0.00'
      })
      .returning()
      .execute();

    // Create deposits with known order
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    await db.insert(depositsTable)
      .values([
        {
          user_id: user.id,
          amount: '10.00',
          payment_method: 'DANA',
          status: 'PENDING',
          created_at: twoHoursAgo
        },
        {
          user_id: user.id,
          amount: '20.00',
          payment_method: 'OVO',
          status: 'PENDING',
          created_at: now
        },
        {
          user_id: user.id,
          amount: '15.00',
          payment_method: 'GOPAY',
          status: 'PENDING',
          created_at: oneHourAgo
        }
      ])
      .execute();

    const input: GetUserDepositsInput = {
      user_id: user.id
    };

    const result = await getUserDeposits(input);

    // Should be ordered by created_at descending (most recent first)
    expect(result).toHaveLength(3);
    expect(result[0].amount).toBe(20); // Most recent
    expect(result[1].amount).toBe(15); // Middle
    expect(result[2].amount).toBe(10); // Oldest
  });

  it('should return empty array for user with no deposits', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'user@test.com',
        password_hash: 'hash',
        balance: '0.00'
      })
      .returning()
      .execute();

    const input: GetUserDepositsInput = {
      user_id: user.id
    };

    const result = await getUserDeposits(input);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return empty array for non-existent user', async () => {
    const input: GetUserDepositsInput = {
      user_id: 999999 // Non-existent user ID
    };

    const result = await getUserDeposits(input);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should handle all deposit statuses correctly', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'user@test.com',
        password_hash: 'hash',
        balance: '0.00'
      })
      .returning()
      .execute();

    // Create deposits with different statuses
    await db.insert(depositsTable)
      .values([
        {
          user_id: user.id,
          amount: '10.00',
          payment_method: 'DANA',
          status: 'PENDING'
        },
        {
          user_id: user.id,
          amount: '20.00',
          payment_method: 'OVO',
          status: 'APPROVED'
        },
        {
          user_id: user.id,
          amount: '30.00',
          payment_method: 'GOPAY',
          status: 'REJECTED'
        }
      ])
      .execute();

    const input: GetUserDepositsInput = {
      user_id: user.id
    };

    const result = await getUserDeposits(input);

    expect(result).toHaveLength(3);

    const statuses = result.map(deposit => deposit.status);
    expect(statuses).toContain('PENDING');
    expect(statuses).toContain('APPROVED');
    expect(statuses).toContain('REJECTED');
  });

  it('should handle all payment methods correctly', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'user@test.com',
        password_hash: 'hash',
        balance: '0.00'
      })
      .returning()
      .execute();

    // Create deposits with all payment methods
    await db.insert(depositsTable)
      .values([
        {
          user_id: user.id,
          amount: '10.00',
          payment_method: 'DANA',
          target_number: '081234567890',
          status: 'PENDING'
        },
        {
          user_id: user.id,
          amount: '20.00',
          payment_method: 'OVO',
          target_number: '081234567891',
          status: 'PENDING'
        },
        {
          user_id: user.id,
          amount: '30.00',
          payment_method: 'GOPAY',
          target_number: '081234567892',
          status: 'PENDING'
        },
        {
          user_id: user.id,
          amount: '40.00',
          payment_method: 'QRIS',
          proof_image_url: 'https://example.com/proof.jpg',
          status: 'PENDING'
        }
      ])
      .execute();

    const input: GetUserDepositsInput = {
      user_id: user.id
    };

    const result = await getUserDeposits(input);

    expect(result).toHaveLength(4);

    const paymentMethods = result.map(deposit => deposit.payment_method);
    expect(paymentMethods).toContain('DANA');
    expect(paymentMethods).toContain('OVO');
    expect(paymentMethods).toContain('GOPAY');
    expect(paymentMethods).toContain('QRIS');

    // Verify QRIS deposit has proof_image_url
    const qrisDeposit = result.find(deposit => deposit.payment_method === 'QRIS');
    expect(qrisDeposit?.proof_image_url).toBe('https://example.com/proof.jpg');

    // Verify other deposits have target_number
    const danaDeposit = result.find(deposit => deposit.payment_method === 'DANA');
    expect(danaDeposit?.target_number).toBe('081234567890');
  });
});