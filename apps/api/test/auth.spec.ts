import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as bcrypt from 'bcryptjs';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthService } from '../src/auth/auth.service';
import { RegisterDto } from '../src/auth/dto/register.dto';

describe('AuthService — Role Dashboards Phase 1', () => {
  const mockJwtService: any = {
    sign: (payload: any) => `mock_jwt_token_${payload.sub}`,
  };

  it('1. ADMIN sign-up rejected', async () => {
    const mockPrisma: any = {
      user: {
        findUnique: async () => null,
      },
    };

    const authService = new AuthService(mockPrisma, mockJwtService);

    const adminDto: RegisterDto = {
      name: 'Sneaky Admin',
      email: 'admin@grocereal.com',
      password: 'password123',
      role: UserRole.ADMIN,
    };

    await assert.rejects(
      async () => {
        await authService.register(adminDto);
      },
      (err: any) => {
        assert.ok(err instanceof BadRequestException);
        assert.strictEqual(err.message, 'ADMIN role cannot be selected upon registration');
        return true;
      },
    );
  });

  it('2. wrong password rejected (only bcrypt.compare authenticates)', async () => {
    const realPassword = 'correct_password_123';
    const realHash = await bcrypt.hash(realPassword, 10);

    const mockPrisma: any = {
      user: {
        findUnique: async () => ({
          id: 'user-uuid-1',
          name: 'Alice Customer',
          email: 'alice@grocereal.com',
          passwordHash: realHash,
          role: UserRole.CUSTOMER,
          isActive: true,
        }),
      },
    };

    const authService = new AuthService(mockPrisma, mockJwtService);

    // Test A: Wrong password
    await assert.rejects(
      async () => {
        await authService.login({
          email: 'alice@grocereal.com',
          password: 'wrong_password',
        });
      },
      (err: any) => {
        assert.ok(err instanceof UnauthorizedException);
        assert.strictEqual(err.message, 'Invalid email or password');
        return true;
      },
    );

    // Test B: Ensure plain-text fallback does NOT work if input equals hash
    await assert.rejects(
      async () => {
        await authService.login({
          email: 'alice@grocereal.com',
          password: realHash, // Passing the hash string directly as password must fail
        });
      },
      (err: any) => {
        assert.ok(err instanceof UnauthorizedException);
        assert.strictEqual(err.message, 'Invalid email or password');
        return true;
      },
    );

    // Test C: Correct password succeeds
    const result = await authService.login({
      email: 'alice@grocereal.com',
      password: realPassword,
    });
    assert.ok(result.accessToken);
    assert.strictEqual(result.user.email, 'alice@grocereal.com');
  });

  it('3. manager sign-up creates a store in one transaction', async () => {
    let transactionExecuted = false;
    let createdUser: any = null;
    let createdStore: any = null;

    const mockTx: any = {
      user: {
        create: async ({ data }: any) => {
          createdUser = {
            id: 'mgr-uuid-123',
            name: data.name,
            email: data.email,
            phone: data.phone,
            role: data.role,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          return createdUser;
        },
      },
      store: {
        create: async ({ data }: any) => {
          createdStore = {
            id: 'store-uuid-456',
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          return createdStore;
        },
      },
    };

    const mockPrisma: any = {
      user: {
        findUnique: async () => null,
      },
      $transaction: async (fn: any) => {
        transactionExecuted = true;
        return fn(mockTx);
      },
    };

    const authService = new AuthService(mockPrisma, mockJwtService);

    const managerDto: RegisterDto = {
      name: 'Bob Manager',
      email: 'bob@grocereal.com',
      password: 'password123',
      phone: '+1-555-0102',
      role: UserRole.STORE_MANAGER,
      storeName: 'Fresh Organics Hub',
      storeAddress: '123 Market Square, Suite 4',
      storePhone: '+1-555-9999',
    };

    const result = await authService.register(managerDto);

    // Assert transaction was used
    assert.strictEqual(transactionExecuted, true);

    // Assert user created with STORE_MANAGER role
    assert.strictEqual(createdUser.role, UserRole.STORE_MANAGER);
    assert.strictEqual(createdUser.email, 'bob@grocereal.com');

    // Assert store created with required specs
    assert.ok(createdStore);
    assert.strictEqual(createdStore.managerId, createdUser.id);
    assert.strictEqual(createdStore.name, 'Fresh Organics Hub');
    assert.strictEqual(createdStore.address, '123 Market Square, Suite 4');
    assert.strictEqual(createdStore.phone, '+1-555-9999');
    assert.strictEqual(createdStore.isOpen, true);
    assert.strictEqual(createdStore.minOrderAmount, 1500);
    assert.strictEqual(createdStore.deliveryFee, 299);
    assert.strictEqual(createdStore.isApproved, true);

    // Assert return payload
    assert.ok(result.accessToken);
    assert.strictEqual(result.user.id, 'mgr-uuid-123');
    assert.strictEqual(result.store?.id, 'store-uuid-456');
  });

  it('4. manager sign-up fails if store details are missing', async () => {
    const mockPrisma: any = {
      user: {
        findUnique: async () => null,
      },
    };

    const authService = new AuthService(mockPrisma, mockJwtService);

    const incompleteDto: RegisterDto = {
      name: 'Bob Incomplete',
      email: 'bob_inc@grocereal.com',
      password: 'password123',
      role: UserRole.STORE_MANAGER,
      // Missing storeName, storeAddress, storePhone
    };

    await assert.rejects(
      async () => {
        await authService.register(incompleteDto);
      },
      (err: any) => {
        assert.ok(err instanceof BadRequestException);
        assert.ok(err.message.includes('storeName, storeAddress, and storePhone are required'));
        return true;
      },
    );
  });
});
