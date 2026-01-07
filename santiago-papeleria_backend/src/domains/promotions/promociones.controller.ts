import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Req } from '@nestjs/common';
import { PromocionesService } from './promociones.service';
import { CreatePromocionDto } from './dto/create-promocion.dto';
import { UpdatePromocionDto } from './dto/update-promocion.dto';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';

@Controller('promociones')
export class PromocionesController {
  constructor(private readonly promocionesService: PromocionesService) { }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createPromocionDto: CreatePromocionDto, @Req() req: any) {
    return this.promocionesService.create(createPromocionDto, req.user.sub);
  }

  @Get()
  findAll(@Query() query: any) {
    return this.promocionesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.promocionesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() updatePromocionDto: UpdatePromocionDto, @Req() req: any) {
    return this.promocionesService.update(id, updatePromocionDto, req.user.sub);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string, @Req() req: any) {
    await this.promocionesService.remove(id, req.user.sub);
    return { message: 'Promoción eliminada' };
  }
}
