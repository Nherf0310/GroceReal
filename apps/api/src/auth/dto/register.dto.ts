import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsEnum,
  IsOptional,
  ValidateIf,
} from 'class-validator';
import { UserRole } from '@prisma/client';

export class RegisterDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsEnum(UserRole, { message: 'Role must be CUSTOMER, STORE_MANAGER, or DRIVER' })
  role: UserRole;

  @ValidateIf((o) => o.role === UserRole.STORE_MANAGER)
  @IsNotEmpty({ message: 'storeName is required when role is STORE_MANAGER' })
  @IsString()
  storeName?: string;

  @ValidateIf((o) => o.role === UserRole.STORE_MANAGER)
  @IsNotEmpty({ message: 'storeAddress is required when role is STORE_MANAGER' })
  @IsString()
  storeAddress?: string;

  @ValidateIf((o) => o.role === UserRole.STORE_MANAGER)
  @IsNotEmpty({ message: 'storePhone is required when role is STORE_MANAGER' })
  @IsString()
  storePhone?: string;
}
