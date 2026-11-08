import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { DriverService } from '../src/driver/driver.service';
import { StoreManagementService } from '../src/store/store-management.service';

describe('Order Status Rules & Delivery State Machine', () => {
  it('1. Store: PENDING -> REJECTED requires reason and restores stock & slot', async () => {
    let inventoryIncremented = false;
    let slotDecremented = false;
    let updatedStatus: OrderStatus | null = null;
    let statusHistoryCreated = false;

    const mockPrisma: any = {
      store: {
        findFirst: async () => ({ id: 'store-1', managerId: 'mgr-1' }),
      },
      order: {
        findFirst: async () => ({
          id: 'ord-1',
          storeId: 'store-1',
          deliverySlotId: 'slot-1',
          status: OrderStatus.PENDING,
        }),
      },
      $transaction: async (cb: any) => {
        const tx = {
          orderItem: {
            findMany: async () => [{ productId: 'prod-1', quantityOrdered: 2 }],
          },
          inventory: {
            update: async (args: any) => {
              if (args.data.quantityInStock.increment === 2) inventoryIncremented = true;
            },
          },
          deliverySlot: {
            update: async (args: any) => {
              if (args.data.bookedCount.decrement === 1) slotDecremented = true;
            },
          },
          order: {
            update: async (args: any) => {
              updatedStatus = args.data.status;
              statusHistoryCreated = !!args.data.statusHistory.create;
              return { id: 'ord-1', status: updatedStatus };
            },
          },
        };
        return cb(tx);
      },
    };

    const storeService = new StoreManagementService(mockPrisma);

    // Missing reason should fail
    await assert.rejects(
      async () => {
        await storeService.updateOrderStatus('mgr-1', 'ord-1', {
          status: OrderStatus.REJECTED,
        });
      },
      (err: any) => {
        assert.ok(err instanceof BadRequestException);
        assert.match(err.message, /Reason is required/i);
        return true;
      },
    );

    // With reason should succeed
    const res = await storeService.updateOrderStatus('mgr-1', 'ord-1', {
      status: OrderStatus.REJECTED,
      reason: 'Out of stock on key ingredients',
    });

    assert.strictEqual(res.status, OrderStatus.REJECTED);
    assert.strictEqual(inventoryIncremented, true);
    assert.strictEqual(slotDecremented, true);
    assert.strictEqual(statusHistoryCreated, true);
  });

  it('2. Driver accept assigns driverId+acceptedAt, status stays READY_FOR_DELIVERY, 409 if taken', async () => {
    let acceptedAssigned = false;
    let historyCreated = false;

    const mockPrisma: any = {
      delivery: {
        findFirst: async () => null, // No ongoing delivery
        findUnique: async (args: any) => {
          if (args.where.id === 'deliv-taken') {
            return {
              id: 'deliv-taken',
              driverId: 'other-driver',
              order: { status: OrderStatus.READY_FOR_DELIVERY },
            };
          }
          return {
            id: 'deliv-avail',
            driverId: null,
            orderId: 'ord-ready',
            order: { status: OrderStatus.READY_FOR_DELIVERY },
          };
        },
      },
      $transaction: async (cb: any) => {
        const tx = {
          delivery: {
            update: async (args: any) => {
              if (args.data.driverId === 'drv-1' && args.data.acceptedAt) {
                acceptedAssigned = true;
              }
              return { id: args.where.id, driverId: args.data.driverId };
            },
          },
          orderStatusHistory: {
            create: async (args: any) => {
              if (args.data.status === OrderStatus.READY_FOR_DELIVERY) {
                historyCreated = true;
              }
            },
          },
        };
        return cb(tx);
      },
    };

    const driverService = new DriverService(mockPrisma);

    // 409 if already taken
    await assert.rejects(
      async () => {
        await driverService.acceptDelivery('drv-1', 'deliv-taken');
      },
      (err: any) => {
        assert.ok(err instanceof ConflictException);
        return true;
      },
    );

    // Success on available delivery
    await driverService.acceptDelivery('drv-1', 'deliv-avail');
    assert.strictEqual(acceptedAssigned, true);
    assert.strictEqual(historyCreated, true);
  });

  it('3. Driver: READY_FOR_DELIVERY -> OUT_FOR_DELIVERY -> DELIVERED (sets PAID) & DELIVERY_FAILED requires reason', async () => {
    let paymentStatusPaid = false;
    let finalStatus: OrderStatus | null = null;

    const mockPrisma: any = {
      delivery: {
        findUnique: async () => ({
          id: 'deliv-1',
          driverId: 'drv-1',
          orderId: 'ord-1',
          order: { status: OrderStatus.OUT_FOR_DELIVERY },
        }),
      },
      $transaction: async (cb: any) => {
        const tx = {
          delivery: {
            update: async () => ({ id: 'deliv-1' }),
          },
          order: {
            update: async (args: any) => {
              finalStatus = args.data.status;
              if (args.data.paymentStatus === PaymentStatus.PAID) {
                paymentStatusPaid = true;
              }
              return { id: 'ord-1', status: finalStatus };
            },
          },
        };
        return cb(tx);
      },
    };

    const driverService = new DriverService(mockPrisma);

    // DELIVERY_FAILED requires reason
    await assert.rejects(
      async () => {
        await driverService.updateDeliveryStatus('drv-1', 'deliv-1', {
          status: OrderStatus.DELIVERY_FAILED,
        });
      },
      (err: any) => {
        assert.ok(err instanceof BadRequestException);
        assert.match(err.message, /Reason is required/i);
        return true;
      },
    );

    // DELIVERED sets paymentStatus PAID
    await driverService.updateDeliveryStatus('drv-1', 'deliv-1', {
      status: OrderStatus.DELIVERED,
      notes: 'Customer received package at front door',
    });

    assert.strictEqual(finalStatus, OrderStatus.DELIVERED);
    assert.strictEqual(paymentStatusPaid, true);
  });
});

