import { IsString, IsInt, Min, Max, MinLength, MaxLength } from 'class-validator';

export class CreateReviewDto {
    @IsString()
    @MinLength(3, { message: 'El nombre es demasiado corto' })
    user_name: string;

    @IsInt()
    @Min(1)
    @Max(5)
    rating: number;

    @IsString()
    @MinLength(10, { message: 'El comentario debe tener al menos 10 caracteres' })
    @MaxLength(500, { message: 'El comentario no puede exceder los 500 caracteres' })
    comment: string;
}
