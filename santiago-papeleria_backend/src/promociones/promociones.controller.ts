// src/promociones/promociones.controller.ts

import { Controller, Get, Query, NotFoundException } from '@nestjs/common';
import { PromocionesService } from './promociones.service';
import { PromocionDocument } from './schemas/promocion.schema';

@Controller('promociones') // Ruta base: /promociones
export class PromocionesController {
  constructor(private readonly promocionesService: PromocionesService) {}

  // GET /promociones (Obtiene todas las promociones vigentes)
  @Get()
  async findAllActive(): Promise<PromocionDocument[]> {
    return this.promocionesService.findActiveAndValid();
  }

  // GET /promociones/codigo?code=XXX (Obtiene una promoción por su código)
  @Get('codigo')
  async findByCode(@Query('code') code: string): Promise<PromocionDocument> {
    const promocion = await this.promocionesService.findByCode(
      code.toUpperCase(),
    );

    if (!promocion) {
      throw new NotFoundException(
        `Código promocional ${code} no válido o expirado.`,
      );
    }

    return promocion;
  }
}
