import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { EmailService } from '../email/email.service';
import { CreateAnnouncement } from './dto/create-announcement.dto';

@Injectable()
export class AnnouncementService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly email: EmailService,
    ) {}

    async fetchAnnouncements(sectionId: string) {
        const section = await this.prisma.section.findUnique({
            where: { id: sectionId },
        });

        if (!section) throw new NotFoundException('Section not found');

        return this.prisma.announcement.findMany({
            where: {
                section_id: sectionId,
            },
        });
    }
    async createAnnouncement(data: CreateAnnouncement) {
        const section = await this.prisma.section.findUnique({
            where: { id: data.section_id },
        });

        if (!section) throw new NotFoundException('Section not found');

        return this.prisma.announcement.create({ data });
    }
}
