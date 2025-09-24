import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class StudentService {
    constructor(private readonly prisma: PrismaService) {}

    async fetchMySection(id: string) {
        const section = await this.prisma.section.findFirst({
            where: {
                students: { some: { id } },
            },
            include: {
                subjects: {
                    orderBy: {
                        title: 'asc',
                    },
                },
                teacher: true,
                _count: {
                    select: {
                        students: true,
                    },
                },
            },
        });

        if (!section) throw new NotFoundException('Student not enrolled yet');
        return section;
    }

    async fetchMyActivities(id: string) {
        const section = await this.prisma.section.findFirst({
            where: {
                students: {
                    some: {
                        id,
                    },
                },
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
