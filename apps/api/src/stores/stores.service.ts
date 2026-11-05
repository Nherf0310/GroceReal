import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StoresService {
  constructor(private prisma: PrismaService) {}

  async listApprovedStores(openOnly: boolean = false) {
    const where: any = { isApproved: true };
    if (openOnly) {
      where.isOpen = true;
    }

    return this.prisma.store.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        address: true,
        phone: true,
        imageUrl: true,
        isOpen: true,
        minOrderAmount: true,
        deliveryFee: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async getStoreById(id: string) {
    const store = await this.prisma.store.findFirst({
      where: { id, isApproved: true },
      select: {
        id: true,
        name: true,
        description: true,
        address: true,
        phone: true,
        imageUrl: true,
        isOpen: true,
        minOrderAmount: true,
        deliveryFee: true,
      },
    });

    if (!store) {
      throw new NotFoundException(`Store with ID "${id}" not found or not approved`);
    }

    return store;
  }

  async getCategories(storeId: string) {
    return this.prisma.category.findMany({
      where: { storeId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async getProducts(
    storeId: string,
    options: { categoryId?: string; search?: string; inStockOnly?: boolean },
  ) {
    const where: any = {
      storeId,
      isAvailable: true,
    };

    if (options.categoryId) {
      where.categoryId = options.categoryId;
    }

    if (options.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { description: { contains: options.search, mode: 'insensitive' } },
        { brand: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    if (options.inStockOnly) {
      where.inventory = {
        quantityInStock: {
          gt: 0,
        },
      };
    }

    return this.prisma.product.findMany({
      where,
      include: {
        category: true,
        inventory: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async getProductById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        inventory: true,
        store: {
          select: {
            id: true,
            name: true,
            deliveryFee: true,
            minOrderAmount: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }

    return product;
  }

  async getDeliverySlots(storeId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const slots = await this.prisma.deliverySlot.findMany({
      where: {
        storeId,
        date: {
          gte: today,
        },
      },
      orderBy: [
        { date: 'asc' },
        { startTime: 'asc' },
      ],
    });

    const now = new Date();

    // Hides full slots and slots starting in under 60 minutes
    return slots.filter((slot) => {
      if (slot.bookedCount >= slot.capacity) {
        return false;
      }

      const [hours, minutes] = slot.startTime.split(':').map(Number);
      const start = new Date(slot.date);
      start.setHours(hours, minutes, 0, 0);

      const minutesUntilStart = (start.getTime() - now.getTime()) / (1000 * 60);
      return minutesUntilStart >= 60;
    });
  }
}
