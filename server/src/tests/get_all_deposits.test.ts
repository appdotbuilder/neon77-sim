import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, depositsTable } from '../db/schema';
import { getAllDeposits } from '../handlers/get_all_deposits';

describe('getAllDeposits', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no deposits exist', async () => {
    const result = await getAllDeposits();

    expect(result).toEqual([]);
  });

  it('should fetch all deposits ordered by created_at desc', async () => {
    // Create test users first
    const user1Result = await db.insert(usersTable)
      .values({
        username: 'user1',
        email: 'user1@example.com',
        password_hash: 'hashed_password_1',
        balance: '0.00'
      })
      .returning()
      .execute();

    const user2Result = await db.insert(usersTable)
      .values({
        username: 'user2',
        email: 'user2@example.com',
        password_hash: 'hashed_password_2',
        balance: '0.00'
      })
      .returning()
      .execute();

    const user1Id = user1Result[0].id;
    const user2Id = user2Result[0].id;

    // Create deposits with slight delays to ensure different timestamps
    const deposit1Result = await db.insert(depositsTable)
      .values({
        user_id: user1Id,
        amount: '100.50',
        payment_method: 'DANA',
        target_number: '081234567890',
        status: 'PENDING'
      })
      .returning()
      .execute();

    // Add small delay to ensure different created_at timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const deposit2Result = await db.insert(depositsTable)
      .values({
        user_id: user2Id,
        amount: '250.75',
        payment_method: 'QRIS',
        proof_image_url: 'https://example.com/proof.jpg',
        status: 'APPROVED',
        admin_notes: 'Approved by admin'
      })
      .returning()
      .execute();

    // Add small delay to ensure different created_at timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const deposit3Result = await db.insert(depositsTable)
      .values({
        user_id: user1Id,
        amount: '75.25',
        payment_method: 'GOPAY',
        target_number: '081987654321',
        status: 'REJECTED',
        admin_notes: 'Insufficient proof'
      })
      .returning()
      .execute();

    const result = await getAllDeposits();

    // Should return all 3 deposits
    expect(result).toHaveLength(3);

    // Should be ordered by created_at descending (most recent first)
    expect(result[0].id).toBe(deposit3Result[0].id); // Most recent
    expect(result[1].id).toBe(deposit2Result[0].id); // Second
    expect(result[2].id).toBe(deposit1Result[0].id); // Oldest

    // Verify numeric conversion
    expect(typeof result[0].amount).toBe('number');
    expect(result[0].amount).toBe(75.25);
    expect(result[1].amount).toBe(250.75);
    expect(result[2].amount).toBe(100.50);

    // Verify all fields are present
    expect(result[0].user_id).toBe(user1Id);
    expect(result[0].payment_method).toBe('GOPAY');
    expect(result[0].target_number).toBe('081987654321');
    expect(result[0].status).toBe('REJECTED');
    expect(result[0].admin_notes).toBe('Insufficient proof');
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);

    expect(result[1].user_id).toBe(user2Id);
    expect(result[1].payment_method).toBe('QRIS');
    expect(result[1].proof_image_url).toBe('https://example.com/proof.jpg');
    expect(result[1].status).toBe('APPROVED');
    expect(result[1].admin_notes).toBe('Approved by admin');
  });

  it('should handle deposits with null optional fields', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashed_password',
        balance: '0.00'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create deposit with minimal fields (nulls for optional fields)
    await db.insert(depositsTable)
      .values({
        user_id: userId,
        amount: '50.00',
        payment_method: 'OVO',
        status: 'PENDING'
        // target_number, proof_image_url, admin_response_image_url, admin_notes will be null
      })
      .execute();

    const result = await getAllDeposits();

    expect(result).toHaveLength(1);
    expect(result[0].user_id).toBe(userId);
    expect(result[0].amount).toBe(50.00);
    expect(result[0].payment_method).toBe('OVO');
    expect(result[0].status).toBe('PENDING');
    expect(result[0].target_number).toBeNull();
    expect(result[0].proof_image_url).toBeNull();
    expect(result[0].admin_response_image_url).toBeNull();
    expect(result[0].admin_notes).toBeNull();
  });

  it('should fetch deposits from multiple users correctly', async () => {
    // Create multiple users
    const users = await Promise.all([
      db.insert(usersTable)
        .values({
          username: 'alice',
          email: 'alice@example.com',
          password_hash: 'hashed_password_alice',
          balance: '0.00'
        })
        .returning()
        .execute(),
      
      db.insert(usersTable)
        .values({
          username: 'bob',
          email: 'bob@example.com',
          password_hash: 'hashed_password_bob',
          balance: '0.00'
        })
        .returning()
        .execute(),
      
      db.insert(usersTable)
        .values({
          username: 'charlie',
          email: 'charlie@example.com',
          password_hash: 'hashed_password_charlie',
          balance: '0.00'
        })
        .returning()
        .execute()
    ]);

    const userIds = users.map(result => result[0].id);

    // Create deposits for each user
    await Promise.all([
      db.insert(depositsTable)
        .values({
          user_id: userIds[0],
          amount: '100.00',
          payment_method: 'DANA',
          target_number: '081111111111',
          status: 'PENDING'
        })
        .execute(),
      
      db.insert(depositsTable)
        .values({
          user_id: userIds[1],
          amount: '200.00',
          payment_method: 'GOPAY',
          target_number: '082222222222',
          status: 'APPROVED'
        })
        .execute(),
      
      db.insert(depositsTable)
        .values({
          user_id: userIds[2],
          amount: '300.00',
          payment_method: 'QRIS',
          proof_image_url: 'https://example.com/proof3.jpg',
          status: 'REJECTED'
        })
        .execute()
    ]);

    const result = await getAllDeposits();

    expect(result).toHaveLength(3);
    
    // Verify all user_ids are present
    const resultUserIds = result.map(deposit => deposit.user_id);
    expect(resultUserIds).toContain(userIds[0]);
    expect(resultUserIds).toContain(userIds[1]);
    expect(resultUserIds).toContain(userIds[2]);

    // Verify amounts are correctly converted
    const amounts = result.map(deposit => deposit.amount);
    expect(amounts).toContain(100.00);
    expect(amounts).toContain(200.00);
    expect(amounts).toContain(300.00);
  });
});