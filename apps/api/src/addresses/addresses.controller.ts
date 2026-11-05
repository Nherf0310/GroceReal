import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AddressesService } from './addresses.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('addresses')
@UseGuards(JwtAuthGuard)
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Get()
  async getAddresses(@Request() req: any) {
    return this.addressesService.listUserAddresses(req.user.id);
  }

  @Post()
  async createAddress(@Request() req: any, @Body() dto: CreateAddressDto) {
    return this.addressesService.createAddress(req.user.id, dto);
  }

  @Patch(':id')
  async updateAddress(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.addressesService.updateAddress(req.user.id, id, dto);
  }

  @Delete(':id')
  async deleteAddress(@Request() req: any, @Param('id') id: string) {
    return this.addressesService.deleteAddress(req.user.id, id);
  }
}
