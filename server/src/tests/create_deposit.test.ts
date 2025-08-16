import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { depositsTable, usersTable } from '../db/schema';
import { type CreateDepositInput } from '../schema';
import { createDeposit } from '../handlers/create_deposit';
import { eq } from 'drizzle-orm';
// Test user data
const testUser = {
  username: 'testuser',
  email: 'test@example.com',
  password_hash: 'hashed_password_123'
};

// Helper function to create a test user and return the user ID
const createTestUser = async (): Promise<number> => {
  const result = await db.insert(usersTable)
    .values(testUser)
    .returning()
    .execute();
  
  return result[0].id;
};

describe('createDeposit', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a DANA deposit with correct target number', async () => {
    const userId = await createTestUser();
    
    const testInput: CreateDepositInput = {
      user_id: userId,
      amount: 100000,
      payment_method: 'DANA'
    };

    const result = await createDeposit(testInput);

    // Basic field validation
    expect(result.user_id).toEqual(userId);
    expect(result.amount).toEqual(100000);
    expect(typeof result.amount).toBe('number');
    expect(result.payment_method).toEqual('DANA');
    expect(result.target_number).toEqual('083176891367');
    expect(result.proof_image_url).toBeNull();
    expect(result.status).toEqual('PENDING');
    expect(result.admin_response_image_url).toBeNull();
    expect(result.admin_notes).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create an OVO deposit with correct target number', async () => {
    const userId = await createTestUser();
    
    const testInput: CreateDepositInput = {
      user_id: userId,
      amount: 50000,
      payment_method: 'OVO'
    };

    const result = await createDeposit(testInput);

    expect(result.payment_method).toEqual('OVO');
    expect(result.target_number).toEqual('083194537338');
    expect(result.amount).toEqual(50000);
    expect(typeof result.amount).toBe('number');
  });

  it('should create a GOPAY deposit with correct target number', async () => {
    const userId = await createTestUser();
    
    const testInput: CreateDepositInput = {
      user_id: userId,
      amount: 75000,
      payment_method: 'GOPAY'
    };

    const result = await createDeposit(testInput);

    expect(result.payment_method).toEqual('GOPAY');
    expect(result.target_number).toEqual('083194537338');
    expect(result.amount).toEqual(75000);
    expect(typeof result.amount).toBe('number');
  });

  it('should create a QRIS deposit with proof image and no target number', async () => {
    const userId = await createTestUser();
    
    const testInput: CreateDepositInput = {
      user_id: userId,
      amount: 25000,
      payment_method: 'QRIS',
      proof_image_url: 'https://example.com/proof.jpg'
    };

    const result = await createDeposit(testInput);

    expect(result.payment_method).toEqual('QRIS');
    expect(result.target_number).toBeNull();
    expect(result.proof_image_url).toEqual('https://example.com/proof.jpg');
    expect(result.amount).toEqual(25000);
    expect(typeof result.amount).toBe('number');
  });

  it('should save deposit to database correctly', async () => {
    const userId = await createTestUser();
    
    const testInput: CreateDepositInput = {
      user_id: userId,
      amount: 200000,
      payment_method: 'DANA'
    };

    const result = await createDeposit(testInput);

    // Query database to verify deposit was saved
    const deposits = await db.select()
      .from(depositsTable)
      .where(eq(depositsTable.id, result.id))
      .execute();

    expect(deposits).toHaveLength(1);
    const savedDeposit = deposits[0];
    expect(savedDeposit.user_id).toEqual(userId);
    expect(parseFloat(savedDeposit.amount)).toEqual(200000);
    expect(savedDeposit.payment_method).toEqual('DANA');
    expect(savedDeposit.target_number).toEqual('083176891367');
    expect(savedDeposit.status).toEqual('PENDING');
    expect(savedDeposit.created_at).toBeInstanceOf(Date);
  });

  it('should handle decimal amounts correctly', async () => {
    const userId = await createTestUser();
    
    const testInput: CreateDepositInput = {
      user_id: userId,
      amount: 150.75,
      payment_method: 'OVO'
    };

    const result = await createDeposit(testInput);

    expect(result.amount).toEqual(150.75);
    expect(typeof result.amount).toBe('number');

    // Verify in database
    const deposits = await db.select()
      .from(depositsTable)
      .where(eq(depositsTable.id, result.id))
      .execute();

    expect(parseFloat(deposits[0].amount)).toEqual(150.75);
  });

  it('should throw error when user does not exist', async () => {
    const testInput: CreateDepositInput = {
      user_id: 999999, // Non-existent user ID
      amount: 100000,
      payment_method: 'DANA'
    };

    await expect(createDeposit(testInput)).rejects.toThrow(/User with ID 999999 does not exist/i);
  });

  it('should throw error when QRIS deposit lacks proof_image_url', async () => {
    const userId = await createTestUser();
    
    const testInput: CreateDepositInput = {
      user_id: userId,
      amount: 100000,
      payment_method: 'QRIS'
      // Missing proof_image_url
    };

    await expect(createDeposit(testInput)).rejects.toThrow(/QRIS deposits require proof_image_url/i);
  });

  it('should handle optional proof_image_url for non-QRIS payments', async () => {
    const userId = await createTestUser();
    
    const testInput: CreateDepositInput = {
      user_id: userId,
      amount: 100000,
      payment_method: 'DANA',
      proof_image_url: 'https://example.com/optional-proof.jpg'
    };

    const result = await createDeposit(testInput);

    expect(result.proof_image_url).toEqual('https://example.com/optional-proof.jpg');
  });

  it('should create multiple deposits for same user', async () => {
    const userId = await createTestUser();
    
    const deposit1Input: CreateDepositInput = {
      user_id: userId,
      amount: 100000,
      payment_method: 'DANA'
    };

    const deposit2Input: CreateDepositInput = {
      user_id: userId,
      amount: 50000,
      payment_method: 'OVO'
    };

    const result1 = await createDeposit(deposit1Input);
    const result2 = await createDeposit(deposit2Input);

    expect(result1.id).not.toEqual(result2.id);
    expect(result1.user_id).toEqual(userId);
    expect(result2.user_id).toEqual(userId);

    // Verify both deposits exist in database
    const deposits = await db.select()
      .from(depositsTable)
      .where(eq(depositsTable.user_id, userId))
      .execute();

    expect(deposits).toHaveLength(2);
  });
});