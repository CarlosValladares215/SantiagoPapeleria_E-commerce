// src/pedidos/pedidos.controller.ts

import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  NotFoundException,
} from '@nestjs/common';
import { PedidosService } from './pedidos.service';
import { PedidoDocument } from './schemas/pedido.schema';
import { CreatePedidoDto } from './dto/create-pedido.dto'; // Tendrás que crear este DTO

@Controller('pedidos') // Ruta base: /pedidos
export class PedidosController {
  constructor(private readonly pedidosService: PedidosService) { }

  // POST /pedidos (Para crear un nuevo pedido)
  @Post()
  async create(
    @Body() createPedidoDto: CreatePedidoDto,
  ): Promise<PedidoDocument> {
    // Aquí podrías agregar lógica para:
    // 1. Validar stock de items.
    // 2. Generar el numero_pedido_web (usando la colección 'contadores').
    return this.pedidosService.create(createPedidoDto);
  }

  // GET /pedidos
  @Get()
  async findAll(): Promise<PedidoDocument[]> {
    return this.pedidosService.findAll();
  }

  // GET /pedidos/:id
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<PedidoDocument> {
    const pedido = await this.pedidosService.findOne(id);
    if (!pedido) {
      throw new NotFoundException(`Pedido con ID ${id} no encontrado.`);
    }
    return pedido;
  }
  // GET /pedidos/user/:userId
  @Get('user/:userId')
  async findByUser(@Param('userId') userId: string): Promise<PedidoDocument[]> {
    return this.pedidosService.findByUser(userId);
  }
  // PATCH /pedidos/:id/status
  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
  ): Promise<PedidoDocument> {
    return this.pedidosService.updateStatus(id, status);
  }
}
