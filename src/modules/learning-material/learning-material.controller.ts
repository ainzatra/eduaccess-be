import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Put,
    Query,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AuthGuard } from '../auth/guard/auth.guard';
import { LearningMaterialService } from './learning-material.service';
import { ClsService } from 'nestjs-cls';

@UseGuards(AuthGuard)
@Controller('learning-materials')
export class LearningMaterialController {
    constructor(
        private readonly service: LearningMaterialService,
        private readonly cls: ClsService,
    ) {}

    @Post('upload')
    @UseInterceptors(
        FileInterceptor('file', {
            storage: memoryStorage(),
            limits: {
                fileSize: 1000 * 1024 * 1024, // 100MB limit
            },
        }),
    )
    async uploadMaterial(
        @UploadedFile() file: any,
        @Body('title') title: string,
    ) {
        const userId = this.cls.get('auth')?.id;
        return this.service.uploadMaterial(userId, file, title);
    }

    @Get()
    async getMaterials(
        @Query('type') type?: string,
        @Query('search') search?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.service.getMaterials(
            type as any,
            search,
            page ? parseInt(page) : 1,
            limit ? parseInt(limit) : 20,
        );
    }

    @Get(':id')
    async getMaterial(@Param('id') id: string) {
        return this.service.getMaterial(id);
    }

    @Put(':id')
    async updateMaterial(
        @Param('id') id: string,
        @Body() body: { title?: string },
    ) {
        const userId = this.cls.get('auth')?.id;
        return this.service.updateMaterial(id, userId, body);
    }

    @Delete(':id')
    async deleteMaterial(@Param('id') id: string) {
        const userId = this.cls.get('auth')?.id;
        return this.service.deleteMaterial(id, userId);
    }
}
