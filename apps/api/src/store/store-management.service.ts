import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus, UnitType } from '@prisma/client';
import {
  UpdateStoreDto,
  CreateCategoryDto,
  UpdateCategoryDto,
  CreateProductDto,
  UpdateProductDto,
  AdjustInventoryDto,
  CreateDeliverySlotDto,
  UpdateOrderStatusDto,
  FulfillOrderItemDto,
} from './dto/store-management.dto';

// Valid manager-triggered status transitions
const MANAGER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.REJECTED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PICKING],
  [OrderStatus.PICKING]: [OrderStatus.READY_FOR_DELIVERY],
  [OrderStatus.READY_FOR_DELIVERY]: [],
  [OrderStatus.OUT_FOR_DELIVERY]: [],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.REJECTED]: [],
  [OrderStatus.DELIVERY_FAILED]: [],
};

@Injectable()
export class StoreManagementService {
  constructor(private prisma: PrismaService) {}

  // ─── Store Overview ───────────────────────────────────────────────────────────

  async getStoreOverview(managerId: string) {
    const store = await this.getMyStore(managerId);

    // 1. Order counts by status
    const allOrders = await this.prisma.order.findMany({
      where: { storeId: store.id },
      select: { status: true, total: true, createdAt: true },
    });

    const orderCountsByStatus: Record<string, number> = {};
    for (const s of Object.values(OrderStatus)) {
      orderCountsByStatus[s] = 0;
    }
    for (const ord of allOrders) {
      orderCountsByStatus[ord.status] = (orderCountsByStatus[ord.status] ?? 0) + 1;
    }

    // 2. Today's orders and revenue in cents
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayOrders = allOrders.filter((o) => new Date(o.createdAt) >= today);
    const todayOrdersCount = todayOrders.length;
    const todayRevenue = todayOrders
      .filter((o) => o.status !== OrderStatus.CANCELLED && o.status !== OrderStatus.REJECTED)
      .reduce((sum, o) => sum + o.total, 0);

    // 3. Low stock count
    const allProducts = await this.prisma.product.findMany({
      where: { storeId: store.id },
      include: { inventory: true },
    });
    const lowStockCount = allProducts.filter(
      (p) => p.inventory && p.inventory.quantityInStock <= p.inventory.lowStockThreshold,
    ).length;

    // 4. Open slots today
    const todaySlots = await this.prisma.deliverySlot.findMany({
      where: {
        storeId: store.id,
        date: today,
      },
    });
    const openSlotsToday = todaySlots.filter((s) => s.bookedCount < s.capacity).length;

    return {
      orderCountsByStatus,
      todayOrdersCount,
      todayRevenue,
      lowStockCount,
      openSlotsToday,
    };
  }

  // ─── Store Profile ───────────────────────────────────────────────────────────

  async getMyStore(managerId: string) {
    const store = await this.prisma.store.findFirst({
      where: { managerId },
      include: { _count: { select: { products: true, orders: true } } },
    });
    if (!store) throw new NotFoundException('No store found for this manager account');
    return store;
  }

  async updateMyStore(managerId: string, dto: UpdateStoreDto) {
    const store = await this.getMyStore(managerId);
    return this.prisma.store.update({
      where: { id: store.id },
      data: dto,
    });
  }

  // ─── Categories ──────────────────────────────────────────────────────────────

  async createCategory(managerId: string, dto: CreateCategoryDto) {
    const store = await this.getMyStore(managerId);
    return this.prisma.category.create({
      data: { storeId: store.id, name: dto.name, sortOrder: dto.sortOrder ?? 0 },
    });
  }

  async updateCategory(managerId: string, categoryId: string, dto: UpdateCategoryDto) {
    const store = await this.getMyStore(managerId);
    const cat = await this.prisma.category.findFirst({
      where: { id: categoryId, storeId: store.id },
    });
    if (!cat) throw new NotFoundException('Category not found in your store');
    return this.prisma.category.update({ where: { id: categoryId }, data: dto });
  }

  // ─── Products ────────────────────────────────────────────────────────────────

  async getStoreProducts(managerId: string) {
    const store = await this.getMyStore(managerId);
    return this.prisma.product.findMany({
      where: { storeId: store.id },
      include: { category: true, inventory: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createProduct(managerId: string, dto: CreateProductDto) {
    const store = await this.getMyStore(managerId);

    // Verify category belongs to store
    const category = await this.prisma.category.findFirst({
      where: { id: dto.categoryId, storeId: store.id },
    });
    if (!category) throw new NotFoundException('Category not found in your store');

    return this.prisma.product.create({
      data: {
        storeId: store.id,
        categoryId: dto.categoryId,
        name: dto.name,
        description: dto.description,
        brand: dto.brand,
        sku: dto.sku,
        imageUrl: dto.imageUrl,
        price: dto.price,
        unitType: dto.unitType as UnitType,
        unitLabel: dto.unitLabel,
        inventory: {
          create: {
            quantityInStock: dto.initialStock ?? 0,
            lowStockThreshold: dto.lowStockThreshold ?? 10,
          },
        },
      },
      include: { inventory: true, category: true },
    });
  }

  async updateProduct(managerId: string, productId: string, dto: UpdateProductDto) {
    const store = await this.getMyStore(managerId);
    const product = await this.prisma.product.findFirst({
      where: { id: productId, storeId: store.id },
    });
    if (!product) throw new NotFoundException('Product not found in your store');
    return this.prisma.product.update({
      where: { id: productId },
      data: dto,
      include: { inventory: true, category: true },
    });
  }

  // ─── Inventory ───────────────────────────────────────────────────────────────

  async adjustInventory(managerId: string, productId: string, dto: AdjustInventoryDto) {
    const store = await this.getMyStore(managerId);
    const product = await this.prisma.product.findFirst({
      where: { id: productId, storeId: store.id },
      include: { inventory: true },
    });
    if (!product) throw new NotFoundException('Product not found in your store');

    const updateData: any = { quantityInStock: dto.quantityInStock };
    if (dto.lowStockThreshold !== undefined) {
      updateData.lowStockThreshold = dto.lowStockThreshold;
    }

    return this.prisma.inventory.update({
      where: { productId },
      data: updateData,
      include: { product: { select: { name: true, unitType: true, unitLabel: true } } },
    });
  }

  async getLowStockProducts(managerId: string) {
    const store = await this.getMyStore(managerId);
    const products = await this.prisma.product.findMany({
      where: { storeId: store.id, isAvailable: true },
      include: { inventory: true, category: true },
      orderBy: { name: 'asc' },
    });
    return products.filter(
      (p) => p.inventory && p.inventory.quantityInStock <= p.inventory.lowStockThreshold,
    );
  }

  // ─── Delivery Slots ───────────────────────────────────────────────────────────

  async getStoreDeliverySlots(managerId: string) {
    const store = await this.getMyStore(managerId);
    return this.prisma.deliverySlot.findMany({
      where: { storeId: store.id },
      orderBy: [
        { date: 'desc' },
        { startTime: 'asc' },
      ],
    });
  }

  async createDeliverySlot(managerId: string, dto: CreateDeliverySlotDto) {
    const store = await this.getMyStore(managerId);
    return this.prisma.deliverySlot.create({
      data: {
        storeId: store.id,
        date: new Date(dto.date),
        startTime: dto.startTime,
        endTime: dto.endTime,
        capacity: dto.capacity ?? 10,
        bookedCount: 0,
      },
    });
  }

  // ─── Order Management ─────────────────────────────────────────────────────────

  async getStoreOrders(managerId: string, status?: string) {
    const store = await this.getMyStore(managerId);
    const where: any = { storeId: store.id };
    if (status) where.status = status;

    return this.prisma.order.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        address: true,
        deliverySlot: true,
        items: {
          include: {
            product: { select: { id: true, name: true, unitType: true, unitLabel: true, imageUrl: true } },
            substitutedProduct: { select: { id: true, name: true } },
          },
        },
        statusHistory: { orderBy: { createdAt: 'desc' }, take: 3 },
        delivery: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getStoreOrderById(managerId: string, orderId: string) {
    const store = await this.getMyStore(managerId);
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, storeId: store.id },
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true } },
        address: true,
        deliverySlot: true,
        items: {
          include: {
            product: true,
            substitutedProduct: true,
          },
        },
        delivery: {
          include: {
            driver: { select: { id: true, name: true, phone: true } },
          },
        },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          include: {
            changedByUser: { select: { id: true, name: true, role: true } },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID "${orderId}" not found in your store`);
    }

    return order;
  }

  async updateOrderStatus(
    managerId: string,
    orderId: string,
    dto: UpdateOrderStatusDto,
  ) {
    const store = await this.getMyStore(managerId);
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, storeId: store.id },
    });
    if (!order) throw new NotFoundException('Order not found in your store');

    const newStatus = dto.status as OrderStatus;
    const allowed = MANAGER_TRANSITIONS[order.status] ?? [];

    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition order from "${order.status}" to "${newStatus}". Allowed transitions: [${allowed.join(', ') || 'none'}]`,
      );
    }

    const reason = dto.notes || dto.reason;
    if (newStatus === OrderStatus.REJECTED && !reason?.trim()) {
      throw new BadRequestException('Reason is required when rejecting an order');
    }

    return this.prisma.$transaction(async (tx) => {
      // If rejecting or cancelling by store, restore stock and slot
      if (newStatus === OrderStatus.REJECTED || newStatus === OrderStatus.CANCELLED) {
        const items = await tx.orderItem.findMany({ where: { orderId } });
        for (const item of items) {
          await tx.inventory.update({
            where: { productId: item.productId },
            data: { quantityInStock: { increment: item.quantityOrdered } },
          });
        }
        await tx.deliverySlot.update({
          where: { id: order.deliverySlotId },
          data: { bookedCount: { decrement: 1 } },
        });
      }

      // If moving to CONFIRMED or READY_FOR_DELIVERY, ensure Delivery record exists
      if (newStatus === OrderStatus.CONFIRMED || newStatus === OrderStatus.READY_FOR_DELIVERY) {
        const existingDelivery = await tx.delivery.findUnique({ where: { orderId } });
        if (!existingDelivery) {
          await tx.delivery.create({
            data: { orderId },
          });
        }
      }

      const orderData: any = {
        status: newStatus,
      };
      if (newStatus === OrderStatus.REJECTED) {
        orderData.rejectionReason = reason;
      }

      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          ...orderData,
          statusHistory: {
            create: {
              status: newStatus,
              changedByUserId: managerId,
              notes: reason ?? `Status updated to ${newStatus} by store manager`,
            },
          },
        },
        include: {
          items: true,
          customer: { select: { id: true, name: true, email: true } },
          delivery: true,
          statusHistory: { orderBy: { createdAt: 'desc' } },
        },
      });

      return updated;
    });
  }

  async fulfillOrderItem(
    managerId: string,
    orderId: string,
    itemId: string,
    dto: FulfillOrderItemDto,
  ) {
    const store = await this.getMyStore(managerId);

    const order = await this.prisma.order.findFirst({
      where: { id: orderId, storeId: store.id },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('Order not found in your store');

    if (order.status !== OrderStatus.PICKING) {
      throw new BadRequestException(
        `Can only update item fulfillment while order is in PICKING status. Current status: "${order.status}"`,
      );
    }

    const item = order.items.find((i) => i.id === itemId);
    if (!item) throw new NotFoundException('Order item not found');

    return this.prisma.$transaction(async (tx) => {
      // ─── Case 1: Substitution ─────────────────────────────────────────────
      if (dto.substitutedProductId) {
        const substitute = await tx.product.findFirst({
          where: { id: dto.substitutedProductId, storeId: store.id },
          include: { inventory: true },
        });
        if (!substitute) {
          throw new NotFoundException('Substitute product not found in your store');
        }

        const subStock = substitute.inventory?.quantityInStock ?? 0;
        if (subStock <= 0) {
          throw new BadRequestException('Substitute product is out of stock');
        }

        const subQuantity = dto.substituteQuantity ?? dto.quantityFulfilled;
        if (subStock < subQuantity) {
          throw new BadRequestException('Insufficient stock for substitute product');
        }

        // Calculate uncapped replacement cost
        let uncappedSubTotal = 0;
        if (substitute.unitType === UnitType.WEIGHT) {
          uncappedSubTotal = Math.round((substitute.price * subQuantity) / 1000);
        } else {
          uncappedSubTotal = substitute.price * subQuantity;
        }

        // Original line total based on ordered quantity
        let originalLineTotal = 0;
        if (item.unitType === UnitType.WEIGHT) {
          originalLineTotal = Math.round((item.unitPrice * item.quantityOrdered) / 1000);
        } else {
          originalLineTotal = item.unitPrice * item.quantityOrdered;
        }

        // Charge replacement's price capped at the original line total
        const finalLineTotal = Math.min(uncappedSubTotal, originalLineTotal);

        // Adjust inventories: return original item's ordered quantity, deduct substitute quantity
        await tx.inventory.update({
          where: { productId: item.productId },
          data: { quantityInStock: { increment: item.quantityOrdered } },
        });

        await tx.inventory.update({
          where: { productId: substitute.id },
          data: { quantityInStock: { decrement: subQuantity } },
        });

        // Update order item with substitute info
        const updatedItem = await tx.orderItem.update({
          where: { id: itemId },
          data: {
            quantityFulfilled: dto.quantityFulfilled,
            substitutedProductId: substitute.id,
            substituteQuantity: subQuantity,
            substituteUnitPrice: substitute.price,
            lineTotal: finalLineTotal,
          },
        });

        // Recalculate order subtotal and total
        const allItems = await tx.orderItem.findMany({ where: { orderId } });
        const newSubtotal = allItems.reduce((sum, i) => sum + i.lineTotal, 0);
        const newTotal = newSubtotal + order.deliveryFee;

        await tx.order.update({
          where: { id: orderId },
          data: { itemSubtotal: newSubtotal, total: newTotal },
        });

        return {
          updatedItem,
          newSubtotal,
          deliveryFee: order.deliveryFee,
          newTotal,
        };
      }

      // ─── Case 2: Weight Picking (No Substitution) ─────────────────────────
      if (item.unitType === UnitType.WEIGHT) {
        // Reject fulfilled weight above 110% of ordered
        const maxAllowed = Math.floor(item.quantityOrdered * 1.1);
        if (dto.quantityFulfilled > maxAllowed) {
          throw new BadRequestException(
            `Fulfilled weight (${dto.quantityFulfilled}g) exceeds 110% of ordered weight (${item.quantityOrdered}g; max allowed: ${maxAllowed}g)`,
          );
        }

        // Adjust inventory by (ordered - fulfilled) (reject if stock would go negative)
        const diff = item.quantityOrdered - dto.quantityFulfilled;
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          include: { inventory: true },
        });
        const currentStock = product?.inventory?.quantityInStock ?? 0;
        if (currentStock + diff < 0) {
          throw new BadRequestException('Insufficient inventory to fulfill requested weight');
        }

        if (diff !== 0) {
          await tx.inventory.update({
            where: { productId: item.productId },
            data: { quantityInStock: { increment: diff } },
          });
        }

        // Recalculate line total = grams x price per kg / 1000 rounded to cents
        const newLineTotal = Math.round((item.unitPrice * dto.quantityFulfilled) / 1000);

        const updatedItem = await tx.orderItem.update({
          where: { id: itemId },
          data: {
            quantityFulfilled: dto.quantityFulfilled,
            lineTotal: newLineTotal,
          },
        });

        const allItems = await tx.orderItem.findMany({ where: { orderId } });
        const newSubtotal = allItems.reduce((sum, i) => sum + i.lineTotal, 0);
        const newTotal = newSubtotal + order.deliveryFee;

        await tx.order.update({
          where: { id: orderId },
          data: { itemSubtotal: newSubtotal, total: newTotal },
        });

        return {
          updatedItem,
          newSubtotal,
          deliveryFee: order.deliveryFee,
          newTotal,
        };
      }

      // ─── Case 3: Unit Type EACH (No Substitution) ──────────────────────────
      const diff = item.quantityOrdered - dto.quantityFulfilled;
      const product = await tx.product.findUnique({
        where: { id: item.productId },
        include: { inventory: true },
      });
      const currentStock = product?.inventory?.quantityInStock ?? 0;
      if (currentStock + diff < 0) {
        throw new BadRequestException('Insufficient inventory to fulfill requested quantity');
      }

      if (diff !== 0) {
        await tx.inventory.update({
          where: { productId: item.productId },
          data: { quantityInStock: { increment: diff } },
        });
      }

      const newLineTotal = item.unitPrice * dto.quantityFulfilled;
      const updatedItem = await tx.orderItem.update({
        where: { id: itemId },
        data: {
          quantityFulfilled: dto.quantityFulfilled,
          lineTotal: newLineTotal,
        },
      });

      const allItems = await tx.orderItem.findMany({ where: { orderId } });
      const newSubtotal = allItems.reduce((sum, i) => sum + i.lineTotal, 0);
      const newTotal = newSubtotal + order.deliveryFee;

      await tx.order.update({
        where: { id: orderId },
        data: { itemSubtotal: newSubtotal, total: newTotal },
      });

      return {
        updatedItem,
        newSubtotal,
        deliveryFee: order.deliveryFee,
        newTotal,
      };
    });
  }
}
