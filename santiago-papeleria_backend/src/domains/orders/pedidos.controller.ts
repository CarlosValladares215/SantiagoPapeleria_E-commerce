import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PedidosService } from './pedidos.service';
import { PedidoDocument } from './schemas/pedido.schema';
import { CreatePedidoDto } from './dto/create-pedido.dto';

@Controller('pedidos')
export class PedidosController {
  constructor(private readonly pedidosService: PedidosService) { }

  // POST /pedidos (Para crear un nuevo pedido)
  @Post()
  async create(
    @Body() createPedidoDto: CreatePedidoDto,
  ): Promise<PedidoDocument> {
    return this.pedidosService.create(createPedidoDto);
  }

  // GET /pedidos
  @Get()
  async findAll(): Promise<PedidoDocument[]> {
    return this.pedidosService.findAll();
  }

  // GET /pedidos/:id
  @Get(':id')
  async findOne(@Param('id') id: string, @Query('userId') userId?: string): Promise<PedidoDocument> {
    const pedido = await this.pedidosService.findOne(id);
    if (!pedido) {
      throw new NotFoundException(`Pedido con ID ${id} no encontrado.`);
    }

    // Security Check: If userId is provided, ensure it matches the order's user
    if (userId) {
      // Handle populated vs unpopulated usuario_id
      const userObj = pedido.usuario_id as any;
      const orderUserId = (userObj && userObj._id) ? userObj._id.toString() : userObj.toString();

      if (orderUserId !== userId) {
        console.log(`⛔ [Backend] Permiso denegado. OrderUser: ${orderUserId}, RequestUser: ${userId}`);
        throw new ForbiddenException('No tienes permiso para ver este pedido.');
      }
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

  // PATCH /pedidos/:id/cancel
  @Patch(':id/cancel')
  async cancelOrder(
    @Param('id') id: string,
    @Body('userId') userId: string,
  ): Promise<PedidoDocument> {
    if (!userId) {
      throw new ForbiddenException('UserId es requerido para cancelar.');
    }
    return this.pedidosService.requestCancellation(id, userId);
  }

  // POST /pedidos/:id/return
  @Post(':id/return')
  async requestReturn(
    @Param('id') id: string,
    @Body() body: any,
  ): Promise<PedidoDocument> {
    const { userId, items, motivo } = body;
    if (!userId || !items || !motivo) {
      throw new ForbiddenException('Datos incompletos para la devolución');
    }
    return this.pedidosService.requestReturn(id, userId, { items, motivo });
  }

  @Post(':id/return/validate')
  async validateReturn(
    @Param('id') id: string,
    @Body() body: any,
  ): Promise<PedidoDocument> {
    const { decision, observations } = body;
    return this.pedidosService.validateReturn(id, decision, observations);
  }

  // PATCH /pedidos/:id/return/receive (Bodega)
  @Patch(':id/return/receive')
  async receiveReturn(
    @Param('id') id: string,
    @Body('observations') observations: string,
  ): Promise<PedidoDocument> {
    return this.pedidosService.receiveReturn(id, observations);
  }

  // PATCH /pedidos/:id/return/finalize (Admin/Finance)
  @Patch(':id/return/finalize')
  async finalizeReturn(
    @Param('id') id: string,
  ): Promise<PedidoDocument> {
    return this.pedidosService.finalizeReturn(id);
  }
}
