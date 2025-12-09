// src/usuarios/usuarios.controller.ts

import { Controller, Get, Post, Body } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { UsuarioDocument } from './schemas/usuario.schema';
import { CreateUsuarioDto } from './dto/create-usuario.dto';

@Controller('usuarios') // Ruta base: /usuarios
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  // POST /usuarios (Ruta de Registro)
  @Post()
  async create(
    @Body() createUsuarioDto: CreateUsuarioDto,
  ): Promise<UsuarioDocument> {
    return this.usuariosService.create(createUsuarioDto);
  }

  // GET /usuarios
  @Get()
  async findAll(): Promise<UsuarioDocument[]> {
    return this.usuariosService.findAll();
  }
}
