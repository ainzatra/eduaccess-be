import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/modules/prisma/prisma.service';

@Injectable()
export class TeacherService {
    constructor(private readonly prisma: PrismaService) {}

    async fetchMySection(id: string) {
        console.log('Fetching teacher section');
        const section = await this.prisma.section.findFirst({
            where: {
                teacher_id: id,
            },
            include: {
                subjects: {
                    orderBy: {
                        title: 'asc',
                    },
                },
                students: true,
            },
        });

        if (!section)
            throw new NotFoundException(
                'Teacher is not assigned to any section yet',
            );
        return section;
    }

    async fetchMyActivities(id: string) {
        const section = await this.prisma.section.findFirst({
            where: {
                teacher_id: id,
            },
        });

        if (!section) throw new NotFoundException('No section assigned');

        const activities = await this.prisma.activity.findMany({
            where: {
                section_id: section.id,
            },
        });

        return activities;
    }
}
