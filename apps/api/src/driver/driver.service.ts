import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { UpdateDeliveryStatusDto } from './dto/update-delivery-status.dto';

@Injectable()
export class DriverService {
  constructor(private prisma: PrismaService) {}

  /**
   * List available deliveries ready for pickup that have not been assigned to any driver.
   */
  async getAvailableDeliveries() {
    return this.prisma.delivery.findMany({
      where: {
        driverId: null,
        order: {
          status: OrderStatus.READY_FOR_DELIVERY,
        },
      },
      include: {
        order: {
          include: {
            store: {
              select: {
                id: true,
                name: true,
                address: true,
                phone: true,
                imageUrl: true,
              },
            },
            address: true,
            deliverySlot: true,
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    unitType: true,
                    unitLabel: true,
                    imageUrl: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Get the driver's current active delivery (READY_FOR_DELIVERY or OUT_FOR_DELIVERY).
   */
  async getActiveDelivery(driverId: string) {
    return this.prisma.delivery.findFirst({
      where: {
        driverId,
        order: {
          status: { in: [OrderStatus.READY_FOR_DELIVERY, OrderStatus.OUT_FOR_DELIVERY] },
        },
      },
      include: {
        order: {
          include: {
            customer: {
              select: { id: true, name: true, phone: true, email: true },
            },
            store: {
              select: {
                id: true,
                name: true,
                address: true,
                phone: true,
                imageUrl: true,
              },
            },
            address: true,
            deliverySlot: true,
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    unitType: true,
                    unitLabel: true,
                    imageUrl: true,
                  },
                },
                substitutedProduct: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            statusHistory: { orderBy: { createdAt: 'desc' } },
          },
        },
      },
    });
  }

  /**
   * Get the driver's delivery history (DELIVERED or DELIVERY_FAILED).
   */
  async getDeliveryHistory(driverId: string) {
    return this.prisma.delivery.findMany({
      where: {
        driverId,
        order: {
          status: { in: [OrderStatus.DELIVERED, OrderStatus.DELIVERY_FAILED] },
        },
      },
      include: {
        order: {
          include: {
            customer: {
              select: { id: true, name: true },
            },
            store: {
              select: { id: true, name: true },
            },
            address: true,
            statusHistory: { orderBy: { createdAt: 'desc' } },
          },
        },
      },
      orderBy: { deliveredAt: 'desc' },
      take: 50,
    });
  }

  /**
   * Driver accepts an available delivery.
   * Assigns driverId+acceptedAt (status stays READY_FOR_DELIVERY, 409 if taken).
   */
  async acceptDelivery(driverId: string, deliveryId: string) {
    // Check if driver already has an ongoing active delivery
    const existingActive = await this.prisma.delivery.findFirst({
      where: {
        driverId,
        order: {
          status: { in: [OrderStatus.READY_FOR_DELIVERY, OrderStatus.OUT_FOR_DELIVERY] },
        },
      },
    });
    if (existingActive) {
      throw new BadRequestException(
        'You already have an active delivery in progress. Complete it before accepting another.',
      );
    }

    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: { order: true },
    });

    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }

    // 409 Conflict if already taken
    if (delivery.driverId !== null) {
      throw new ConflictException('This delivery has already been accepted by another driver');
    }

    if (delivery.order.status !== OrderStatus.READY_FOR_DELIVERY) {
      throw new BadRequestException(
        `Order is not ready for delivery (current status: ${delivery.order.status})`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedDelivery = await tx.delivery.update({
        where: { id: deliveryId },
        data: {
          driverId,
          acceptedAt: new Date(),
        },
        include: {
          order: {
            include: {
              store: true,
              address: true,
              customer: { select: { id: true, name: true, phone: true } },
            },
          },
        },
      });

      // Status stays READY_FOR_DELIVERY; write OrderStatusHistory
      await tx.orderStatusHistory.create({
        data: {
          orderId: delivery.orderId,
          status: OrderStatus.READY_FOR_DELIVERY,
          changedByUserId: driverId,
          notes: 'Driver accepted delivery',
        },
      });

      return updatedDelivery;
    });
  }

  /**
   * Driver transitions delivery status:
   * READY_FOR_DELIVERY -> OUT_FOR_DELIVERY (picked up)
   * OUT_FOR_DELIVERY -> DELIVERED | DELIVERY_FAILED(reason)
   * DELIVERED sets paymentStatus PAID.
   * DELIVERED, CANCELLED, REJECTED, DELIVERY_FAILED are final.
   */
  async updateDeliveryStatus(
    driverId: string,
    deliveryId: string,
    dto: UpdateDeliveryStatusDto,
  ) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: { order: true },
    });

    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }

    if (delivery.driverId !== driverId) {
      throw new ForbiddenException('You are not assigned to this delivery');
    }

    let targetStatus = dto.status as unknown as string;
    if (targetStatus === 'PICKED_UP') {
      targetStatus = OrderStatus.OUT_FOR_DELIVERY;
    }
    const reason = dto.notes || dto.reason;

    if (delivery.order.status === OrderStatus.READY_FOR_DELIVERY) {
      if (targetStatus !== OrderStatus.OUT_FOR_DELIVERY) {
        throw new BadRequestException(
          `Cannot transition order from "${delivery.order.status}" to "${targetStatus}". Order must be picked up (OUT_FOR_DELIVERY) first.`,
        );
      }
    } else if (delivery.order.status === OrderStatus.OUT_FOR_DELIVERY) {
      if (
        targetStatus !== OrderStatus.DELIVERED &&
        targetStatus !== OrderStatus.DELIVERY_FAILED
      ) {
        throw new BadRequestException(
          `Cannot transition order from "${delivery.order.status}" to "${targetStatus}". Allowed transitions: DELIVERED, DELIVERY_FAILED.`,
        );
      }
      if (targetStatus === OrderStatus.DELIVERY_FAILED && !reason?.trim()) {
        throw new BadRequestException('Reason is required when reporting delivery failure');
      }
    } else {
      throw new BadRequestException(
        `Order status "${delivery.order.status}" cannot be transitioned. DELIVERED, CANCELLED, REJECTED, and DELIVERY_FAILED are final states.`,
      );
    }

    const nextOrderStatus = targetStatus as OrderStatus;

    return this.prisma.$transaction(async (tx) => {
      const deliveryUpdateData: any = {};
      if (nextOrderStatus === OrderStatus.OUT_FOR_DELIVERY) {
        deliveryUpdateData.pickedUpAt = new Date();
      } else if (
        nextOrderStatus === OrderStatus.DELIVERED ||
        nextOrderStatus === OrderStatus.DELIVERY_FAILED
      ) {
        deliveryUpdateData.deliveredAt = new Date();
      }

      const updatedDelivery = await tx.delivery.update({
        where: { id: deliveryId },
        data: deliveryUpdateData,
        include: {
          order: {
            include: {
              customer: { select: { id: true, name: true, phone: true } },
              address: true,
              store: true,
            },
          },
        },
      });

      const orderUpdateData: any = {
        status: nextOrderStatus,
      };

      if (nextOrderStatus === OrderStatus.DELIVERED) {
        orderUpdateData.paymentStatus = PaymentStatus.PAID;
      }

      await tx.order.update({
        where: { id: delivery.orderId },
        data: {
          ...orderUpdateData,
          statusHistory: {
            create: {
              status: nextOrderStatus,
              changedByUserId: driverId,
              notes:
                reason ??
                (nextOrderStatus === OrderStatus.OUT_FOR_DELIVERY
                  ? 'Driver picked up items from store'
                  : 'Order successfully delivered to customer'),
            },
          },
        },
      });

      return updatedDelivery;
    });
  }
}
