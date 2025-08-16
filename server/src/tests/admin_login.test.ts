import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type AdminLoginInput } from '../schema';
import { adminLogin } from '../handlers/admin_login';
import { eq, and } from 'drizzle-orm';

const validAdminInput: AdminLoginInput = {
  username: 'admin',
  password: 'admin'
};

describe('adminLogin', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should authenticate admin with correct credentials', async () => {
    const result = await adminLogin(validAdminInput);

    // Verify admin user properties
    expect(result.username).toEqual('admin');
    expect(result.email).toEqual('admin@neon77.com');
    expect(result.is_admin).toEqual(true);
    expect(result.balance).toEqual(0);
    expect(typeof result.balance).toBe('number'); // Verify numeric conversion
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create admin user in database if not exists', async () => {
    await adminLogin(validAdminInput);

    // Verify admin user was created in database
    const adminUsers = await db.select()
      .from(usersTable)
      .where(
        and(
          eq(usersTable.username, 'admin'),
          eq(usersTable.is_admin, true)
        )
      )
      .execute();

    expect(adminUsers).toHaveLength(1);
    expect(adminUsers[0].username).toEqual('admin');
    expect(adminUsers[0].email).toEqual('admin@neon77.com');
    expect(adminUsers[0].is_admin).toEqual(true);
    expect(parseFloat(adminUsers[0].balance)).toEqual(0);
    expect(adminUsers[0].created_at).toBeInstanceOf(Date);
  });

  it('should return existing admin user if already exists', async () => {
    // First login creates admin user
    const firstResult = await adminLogin(validAdminInput);
    
    // Second login should return existing user
    const secondResult = await adminLogin(validAdminInput);

    expect(firstResult.id).toEqual(secondResult.id);
    expect(firstResult.username).toEqual(secondResult.username);
    expect(firstResult.created_at).toEqual(secondResult.created_at);

    // Verify only one admin user exists in database
    const adminUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.is_admin, true))
      .execute();

    expect(adminUsers).toHaveLength(1);
  });

  it('should reject invalid username', async () => {
    const invalidInput: AdminLoginInput = {
      username: 'wrongadmin',
      password: 'admin'
    };

    await expect(adminLogin(invalidInput)).rejects.toThrow(/invalid admin credentials/i);
  });

  it('should reject invalid password', async () => {
    const invalidInput: AdminLoginInput = {
      username: 'admin',
      password: 'wrongpassword'
    };

    await expect(adminLogin(invalidInput)).rejects.toThrow(/invalid admin credentials/i);
  });

  it('should reject both invalid username and password', async () => {
    const invalidInput: AdminLoginInput = {
      username: 'wrongadmin',
      password: 'wrongpassword'
    };

    await expect(adminLogin(invalidInput)).rejects.toThrow(/invalid admin credentials/i);
  });

  it('should reject empty credentials', async () => {
    const emptyInput: AdminLoginInput = {
      username: '',
      password: ''
    };

    await expect(adminLogin(emptyInput)).rejects.toThrow(/invalid admin credentials/i);
  });

  it('should handle case sensitive credentials', async () => {
    const caseVariantInput: AdminLoginInput = {
      username: 'Admin',
      password: 'admin'
    };

    await expect(adminLogin(caseVariantInput)).rejects.toThrow(/invalid admin credentials/i);
  });

  it('should maintain admin user properties after multiple logins', async () => {
    // First login
    const firstLogin = await adminLogin(validAdminInput);
    
    // Modify admin user in database (simulate some change)
    await db.update(usersTable)
      .set({ 
        updated_at: new Date(),
        email: 'newemail@neon77.com'
      })
      .where(eq(usersTable.id, firstLogin.id))
      .execute();
    
    // Second login should return updated user data
    const secondLogin = await adminLogin(validAdminInput);
    
    expect(secondLogin.id).toEqual(firstLogin.id);
    expect(secondLogin.email).toEqual('newemail@neon77.com');
    expect(secondLogin.is_admin).toEqual(true);
    expect(secondLogin.balance).toEqual(0);
  });
});