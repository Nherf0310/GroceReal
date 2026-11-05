import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BadRequestException } from '@nestjs/common';
import { OrderStatus, UnitType } from '@prisma/client';
import { StoreManagementService } from '../src/store/store-management.service';
import { OrdersService } from '../src/orders/orders.service';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeStoreService(overrides: any = {}) {
  const defaults = {
    store: {
      findFirst: async () => ({ id: 'store-1', managerId: 'mgr-1', _count: {} }),
    },
    order: {
      findFirst: async (args: any) => ({
        id: 'ord-1',
        storeId: 'store-1',
        deliverySlotId: 'slot-1',
        deliveryFee: 300,
        status: OrderStatus.PICKING,
        items: overrides._items ?? [],
      }),
    },
    $transaction: async (cb: any) => cb(overrides._tx ?? {}),
  };
  return new StoreManagementService({ ...defaults, ...overrides } as any);
}

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe('Phase 3 Additional Tests', () => {

  // ── 4. Weight reconciliation ────────────────────────────────────────────────

  it('4a. Weight: fulfilling > 110% of ordered weight throws BadRequestException', async () => {
    const item = {
      id: 'item-1',
      productId: 'prod-1',
      unitType: UnitType.WEIGHT,
      unitPrice: 1000, // 1000 cents per kg
      quantityOrdered: 1000, // 1000g ordered
      lineTotal: 1000,
    };

    let inventoryAdjusted = false;

    const tx: any = {
      product: {
        findUnique: async () => ({
          id: 'prod-1',
          inventory: { quantityInStock: 5000 },
        }),
      },
      inventory: {
        update: async () => { inventoryAdjusted = true; },
      },
      orderItem: {
        update: async (args: any) => ({ ...item, ...args.data }),
        findMany: async () => [item],
      },
      order: {
        update: async () => ({}),
      },
    };

    const mockPrisma: any = {
      store: { findFirst: async () => ({ id: 'store-1', managerId: 'mgr-1', _count: {} }) },
      order: {
        findFirst: async () => ({
          id: 'ord-1',
          storeId: 'store-1',
          deliverySlotId: 'slot-1',
          deliveryFee: 300,
          status: OrderStatus.PICKING,
          items: [item],
        }),
      },
      $transaction: async (cb: any) => cb(tx),
    };

    const svc = new StoreManagementService(mockPrisma);

    // 1101g on 1000g order = 110.1% → exceeds 110% → should reject
    await assert.rejects(
      async () => svc.fulfillOrderItem('mgr-1', 'ord-1', 'item-1', {
        quantityFulfilled: 1101,
      } as any),
      (err: any) => {
        assert.ok(err instanceof BadRequestException);
        assert.match(err.message, /110%/i);
        return true;
      },
    );

    // 1100g = exactly 110% → should be allowed
    assert.ok(inventoryAdjusted === false); // not reached yet
  });

  it('4b. Weight: fulfilling 900g of 1000g ordered restores 100g to inventory and recalculates lineTotal', async () => {
    const item = {
      id: 'item-1',
      productId: 'prod-1',
      unitType: UnitType.WEIGHT,
      unitPrice: 1000, // 1000 cents/kg
      quantityOrdered: 1000, // 1000g
      lineTotal: 1000,
    };

    let inventoryIncrement: number | null = null;
    let savedLineTotal: number | null = null;
    let savedQuantityFulfilled: number | null = null;

    const tx: any = {
      product: {
        findUnique: async () => ({
          id: 'prod-1',
          inventory: { quantityInStock: 500 }, // 500g in stock
        }),
      },
      inventory: {
        update: async (args: any) => {
          inventoryIncrement = args.data.quantityInStock.increment;
        },
      },
      orderItem: {
        update: async (args: any) => {
          savedLineTotal = args.data.lineTotal;
          savedQuantityFulfilled = args.data.quantityFulfilled;
          return { ...item, ...args.data };
        },
        findMany: async () => [{ ...item, lineTotal: savedLineTotal ?? 900, quantityFulfilled: 900 }],
      },
      order: {
        update: async () => ({}),
      },
    };

    const mockPrisma: any = {
      store: { findFirst: async () => ({ id: 'store-1', managerId: 'mgr-1', _count: {} }) },
      order: {
        findFirst: async () => ({
          id: 'ord-1',
          storeId: 'store-1',
          deliverySlotId: 'slot-1',
          deliveryFee: 300,
          status: OrderStatus.PICKING,
          items: [item],
        }),
      },
      $transaction: async (cb: any) => cb(tx),
    };

    const svc = new StoreManagementService(mockPrisma);
    await svc.fulfillOrderItem('mgr-1', 'ord-1', 'item-1', {
      quantityFulfilled: 900,
    } as any);

    // diff = 1000 - 900 = 100g → returned to inventory
    assert.strictEqual(inventoryIncrement, 100);
    // lineTotal = round(1000 * 900 / 1000) = 900 cents
    assert.strictEqual(savedLineTotal, 900);
    assert.strictEqual(savedQuantityFulfilled, 900);
  });

  // ── 5. Substitution price cap ────────────────────────────────────────────────

  it('5a. Substitution: substitute costs more than original → charged at original line total (capped)', async () => {
    const originalItem = {
      id: 'item-1',
      productId: 'prod-original',
      unitType: UnitType.EACH,
      unitPrice: 500, // 500 cents each
      quantityOrdered: 1,
      lineTotal: 500,
    };

    let savedLineTotal: number | null = null;
    let savedSubUnitPrice: number | null = null;

    const tx: any = {
      product: {
        findFirst: async () => ({
          id: 'prod-sub',
          storeId: 'store-1',
          unitType: UnitType.EACH,
          price: 800, // 800 cents — more expensive
          inventory: { quantityInStock: 10 },
        }),
      },
      inventory: {
        update: async () => {},
      },
      orderItem: {
        update: async (args: any) => {
          savedLineTotal = args.data.lineTotal;
          savedSubUnitPrice = args.data.substituteUnitPrice;
          return { ...originalItem, ...args.data };
        },
        findMany: async () => [{ ...originalItem, lineTotal: 500 }],
      },
      order: {
        update: async () => ({}),
      },
    };

    const mockPrisma: any = {
      store: { findFirst: async () => ({ id: 'store-1', managerId: 'mgr-1', _count: {} }) },
      order: {
        findFirst: async () => ({
          id: 'ord-1',
          storeId: 'store-1',
          deliverySlotId: 'slot-1',
          deliveryFee: 300,
          status: OrderStatus.PICKING,
          items: [originalItem],
        }),
      },
      $transaction: async (cb: any) => cb(tx),
    };

    const svc = new StoreManagementService(mockPrisma);
    await svc.fulfillOrderItem('mgr-1', 'ord-1', 'item-1', {
      quantityFulfilled: 1,
      substitutedProductId: 'prod-sub',
      substituteQuantity: 1,
    } as any);

    // Charged at min(800, 500) = 500 (capped at original)
    assert.strictEqual(savedLineTotal, 500);
    // substituteUnitPrice stored is the substitute's actual price
    assert.strictEqual(savedSubUnitPrice, 800);
  });

  it('5b. Substitution: substitute costs less than original → charged at substitute price (not capped)', async () => {
    const originalItem = {
      id: 'item-1',
      productId: 'prod-original',
      unitType: UnitType.EACH,
      unitPrice: 500,
      quantityOrdered: 1,
      lineTotal: 500,
    };

    let savedLineTotal: number | null = null;

    const tx: any = {
      product: {
        findFirst: async () => ({
          id: 'prod-sub',
          storeId: 'store-1',
          unitType: UnitType.EACH,
          price: 300, // cheaper substitute
          inventory: { quantityInStock: 10 },
        }),
      },
      inventory: { update: async () => {} },
      orderItem: {
        update: async (args: any) => {
          savedLineTotal = args.data.lineTotal;
          return { ...originalItem, ...args.data };
        },
        findMany: async () => [{ ...originalItem, lineTotal: 300 }],
      },
      order: { update: async () => ({}) },
    };

    const mockPrisma: any = {
      store: { findFirst: async () => ({ id: 'store-1', managerId: 'mgr-1', _count: {} }) },
      order: {
        findFirst: async () => ({
          id: 'ord-1',
          storeId: 'store-1',
          deliverySlotId: 'slot-1',
          deliveryFee: 300,
          status: OrderStatus.PICKING,
          items: [originalItem],
        }),
      },
      $transaction: async (cb: any) => cb(tx),
    };

    const svc = new StoreManagementService(mockPrisma);
    await svc.fulfillOrderItem('mgr-1', 'ord-1', 'item-1', {
      quantityFulfilled: 1,
      substitutedProductId: 'prod-sub',
      substituteQuantity: 1,
    } as any);

    // Charged at min(300, 500) = 300 (not capped)
    assert.strictEqual(savedLineTotal, 300);
  });

  // ── 6. Slot cutoff (60 minutes) ───────────────────────────────────────────────

  it('6. createOrder: slot starting in < 60 min throws BadRequestException', async () => {
    // Slot starts 30 minutes from now
    const slotStart = new Date(Date.now() + 30 * 60 * 1000);
    const slotDate = new Date(slotStart);
    slotDate.setHours(0, 0, 0, 0);
    const startTime = `${String(slotStart.getHours()).padStart(2, '0')}:${String(slotStart.getMinutes()).padStart(2, '0')}`;

    const mockPrisma: any = {
      store: {
        findUnique: async () => ({ id: 'store-1', isApproved: true, isOpen: true }),
      },
      address: {
        findFirst: async () => ({ id: 'addr-1', userId: 'cust-1' }),
      },
      deliverySlot: {
        findUnique: async () => ({
          id: 'slot-30min',
          storeId: 'store-1',
          date: slotDate,
          startTime,
          bookedCount: 0,
          capacity: 10,
        }),
      },
      product: { findMany: async () => [] },
      $transaction: async (cb: any) => cb({}),
    };

    const ordersService = new OrdersService(mockPrisma);

    await assert.rejects(
      async () => ordersService.createOrder('cust-1', {
        storeId: 'store-1',
        addressId: 'addr-1',
        deliverySlotId: 'slot-30min',
        paymentMethod: 'CASH_ON_DELIVERY' as any,
        items: [{ productId: 'prod-1', quantity: 1 }],
      }),
      (err: any) => {
        assert.ok(err instanceof BadRequestException);
        assert.match(err.message, /60 minutes/i);
        return true;
      },
    );
  });

  // ── 7. Cancel restores stock and slot ─────────────────────────────────────────

  it('7. Customer CANCEL restores inventory and decrements slot bookedCount', async () => {
    let inventoryRestored = false;
    let slotDecremented = false;
    let cancelledStatus: OrderStatus | null = null;

    const orderWithItems = {
      id: 'ord-1',
      customerId: 'cust-1',
      storeId: 'store-1',
      deliverySlotId: 'slot-1',
      status: OrderStatus.PENDING,
      items: [{ productId: 'prod-1', quantityOrdered: 3 }],
    };

    const mockPrisma: any = {
      order: {
        findUnique: async () => orderWithItems,
      },
      $transaction: async (cb: any) => {
        const tx = {
          inventory: {
            update: async (args: any) => {
              if (args.data.quantityInStock.increment === 3) inventoryRestored = true;
            },
          },
          deliverySlot: {
            update: async (args: any) => {
              if (args.data.bookedCount.decrement === 1) slotDecremented = true;
            },
          },
          order: {
            update: async (args: any) => {
              cancelledStatus = args.data.status;
              return { id: 'ord-1', status: cancelledStatus, items: [], statusHistory: [] };
            },
          },
        };
        return cb(tx);
      },
    };

    const ordersService = new OrdersService(mockPrisma);
    const result = await ordersService.cancelOrder('ord-1', 'cust-1');

    assert.strictEqual(result.status, OrderStatus.CANCELLED);
    assert.strictEqual(inventoryRestored, true, 'Inventory should be restored');
    assert.strictEqual(slotDecremented, true, 'Slot bookedCount should be decremented');
  });
});
