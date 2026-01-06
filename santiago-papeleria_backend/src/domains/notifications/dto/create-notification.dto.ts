
import { IsNotEmpty, IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateNotificationDto {
    @IsNotEmpty()
    @IsString()
    usuario_id: string;

    @IsNotEmpty()
    @IsString()
    titulo: string;

    @IsNotEmpty()
    @IsString()
    mensaje: string;

    @IsOptional()
    @IsString()
    tipo?: string;

    @IsOptional()
    metadata?: any;
}
