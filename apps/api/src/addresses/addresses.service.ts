import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class AddressesService {
  constructor(private prisma: PrismaService) {}

  async listUserAddresses(userId: string) {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async createAddress(userId: string, dto: CreateAddressDto) {
    if (dto.isDefault) {
      // Unset previous defaults
      await this.prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    // If first address, make default
    const count = await this.prisma.address.count({ where: { userId } });
    const isDefault = dto.isDefault ?? count === 0;

    return this.prisma.address.create({
      data: {
        userId,
        label: dto.label,
        street: dto.street,
        city: dto.city,
        postalCode: dto.postalCode,
        latitude: dto.latitude,
        longitude: dto.longitude,
        isDefault,
      },
    });
  }

  async updateAddress(userId: string, addressId: string, dto: UpdateAddressDto) {
    const address = await this.prisma.address.findUnique({
      where: { id: addressId },
    });
    if (!address) {
      throw new NotFoundException('Address not found');
    }
    if (address.userId !== userId) {
      throw new ForbiddenException('You do not have permission to modify this address');
    }

    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId, isDefault: true, id: { not: addressId } },
        data: { isDefault: false },
      });
    }

    return this.prisma.address.update({
      where: { id: addressId },
      data: dto,
    });
  }

  async deleteAddress(userId: string, addressId: string) {
    const address = await this.prisma.address.findUnique({
      where: { id: addressId },
    });
    if (!address) {
      throw new NotFoundException('Address not found');
    }
    if (address.userId !== userId) {
      throw new ForbiddenException('You do not have permission to delete this address');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.address.delete({
        where: { id: addressId },
      });

      // If deleting the default address, promote another one
      if (address.isDefault) {
        const nextAddress = await tx.address.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        });
        if (nextAddress) {
          await tx.address.update({
            where: { id: nextAddress.id },
            data: { isDefault: true },
          });
        }
      }

      return { success: true, message: 'Address deleted successfully' };
    });
  }
}
