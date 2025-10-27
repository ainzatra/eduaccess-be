import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/modules/prisma/prisma.service';
import { S3Service } from '../s3.service';
import { MaterialType } from '@prisma/client';

@Injectable()
export class LearningMaterialService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly s3: S3Service,
    ) {}

    async uploadMaterial(userId: string, file: any, title: string) {
        // Validate file type
        const materialType = this.getMaterialType(file.mimetype);
        if (!materialType) {
            throw new BadRequestException(
                `Invalid file type: ${file.mimetype}`,
            );
        }

        // Create material record first to get ID
        const material = await this.prisma.learningMaterial.create({
            data: {
                title,
                type: materialType,
                created_by: userId,
                mime_type: file.mimetype,
                file_size: file.size,
            },
        });

        // Upload to S3 with new key structure
        const s3Key = `learning-materials/${material.id}/${file.originalname}`;
        const url = await this.s3.upload(file, s3Key);

        // Update material with S3 details
        await this.prisma.learningMaterial.update({
            where: { id: material.id },
            data: {
                url,
                s3_key: s3Key,
            },
        });

        return this.getMaterial(material.id);
    }

    async getMaterials(
        type?: MaterialType,
        search?: string,
        page = 1,
        limit = 20,
    ) {
        const where: any = {};

        if (type) {
            where.type = type;
        }

        if (search) {
            where.OR = [
                {
                    title: {
                        contains: search,
                        mode: 'insensitive',
                    },
                },
            ];
        }

        const materials = await this.prisma.learningMaterial.findMany({
            where,
            include: {
                creator: {
                    select: {
                        id: true,
                        full_name: true,
                    },
                },
            },
            orderBy: {
                title: 'asc',
            },
            skip: (page - 1) * limit,
            take: limit,
        });

        const total = await this.prisma.learningMaterial.count({ where });

        return {
            materials,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async getMaterial(id: string) {
        const material = await this.prisma.learningMaterial.findUnique({
            where: { id },
            include: {
                creator: {
                    select: {
                        id: true,
                        full_name: true,
                    },
                },
            },
        });

        if (!material) {
            throw new NotFoundException('Material not found');
        }

        return material;
    }

    async deleteMaterial(id: string, userId: string) {
        const material = await this.prisma.learningMaterial.findUnique({
            where: { id },
        });

        if (!material) {
            throw new NotFoundException('Material not found');
        }

        if (material.created_by !== userId) {
            throw new BadRequestException(
                'You can only delete your own materials',
            );
        }

        // Check if material is used in any lessons
        const usageCount = await this.prisma.lessonMaterial.count({
            where: { material_id: id },
        });

        if (usageCount > 0) {
            throw new BadRequestException(
                'Cannot delete material that is used in lessons',
            );
        }

        // Delete from S3
        // await this.s3.delete(material.s3_key);

        // Delete from database
        await this.prisma.learningMaterial.delete({
            where: { id },
        });

        return 'Material deleted successfully';
    }

    async updateMaterial(
        id: string,
        userId: string,
        updateData: { title?: string },
    ) {
        const material = await this.prisma.learningMaterial.findUnique({
            where: { id },
        });

        if (!material) {
            throw new NotFoundException('Material not found');
        }

        if (material.created_by !== userId) {
            throw new BadRequestException(
                'You can only update your own materials',
            );
        }

        const updatedMaterial = await this.prisma.learningMaterial.update({
            where: { id },
            data: updateData,
            include: {
                creator: {
                    select: {
                        id: true,
                        full_name: true,
                    },
                },
            },
        });

        return updatedMaterial;
    }

    private getMaterialType(mimetype: string): MaterialType | null {
        if (mimetype.startsWith('video/')) {
            return 'video';
        }
        if (mimetype.startsWith('image/')) {
            return 'image';
        }
        if (mimetype === 'text/vtt') {
            return 'subtitle';
        }
        return null;
    }
}
