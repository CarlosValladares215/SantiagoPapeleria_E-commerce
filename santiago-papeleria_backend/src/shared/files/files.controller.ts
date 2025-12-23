import { Controller, Post, UseInterceptors, UploadedFile, Get, Param, Res, HttpException, HttpStatus } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import type { Response } from 'express';
import * as fs from 'fs';

@Controller('files')
export class FilesController {
    @Post('upload')
    @UseInterceptors(FileInterceptor('file', {
        storage: diskStorage({
            destination: './uploads',
            filename: (req, file, cb) => {
                const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
                return cb(null, `${randomName}${extname(file.originalname)}`);
            }
        }),
        fileFilter: (req, file, cb) => {
            if (!file.originalname.match(/\.(jpg|jpeg|png|pdf)$/)) {
                return cb(new Error('Only image or PDF files are allowed!'), false);
            }
            cb(null, true);
        }
    }))
    uploadFile(@UploadedFile() file: any) { // Using any types to avoid Multer type issues if not strict
        if (!file) throw new HttpException('No file uploaded or invalid format', HttpStatus.BAD_REQUEST);
        return {
            url: `/api/files/${file.filename}`, // Adjust based on your Global Prefix if any, assuming /api
            filename: file.filename
        };
    }

    @Get(':filename')
    seeUploadedFile(@Param('filename') image, @Res() res: Response) {
        const { join } = require('path');
        const uploadPath = join(process.cwd(), 'uploads');
        // Prevent directory traversal
        if (image.includes('..') || image.includes('/') || image.includes('\\')) {
            throw new HttpException('Invalid filename', HttpStatus.BAD_REQUEST);
        }
        const filePath = join(uploadPath, image);

        if (fs.existsSync(filePath)) {
            return res.sendFile(image, { root: uploadPath });
        }
        console.error(`File not found: ${filePath}`);
        throw new HttpException('File not found', HttpStatus.NOT_FOUND);
    }
}
