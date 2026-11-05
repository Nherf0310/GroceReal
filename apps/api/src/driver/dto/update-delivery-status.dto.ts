import { IsEnum, IsOptional, IsString } from 'class-validator';
import { OrderStatus, DeliveryFailureReason } from '@prisma/client';

export class UpdateDeliveryStatusDto {
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @IsOptional()
  @IsEnum(DeliveryFailureReason)
  failureReason?: DeliveryFailureReason;

  @IsOptional()
  @IsString()
  failureNote?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
