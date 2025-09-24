import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AnnouncementService } from './announcement.service';
import { CreateAnnouncement } from './dto/create-announcement.dto';

@Controller('announcement')
export class AnnouncementController {
    constructor(private readonly service: AnnouncementService) {}

    @Post()
    createAnnouncement(@Body() body: CreateAnnouncement) {
        return this.service.createAnnouncement(body);
    }

    @Get(':sectionId')
    fetchAnnouncements(@Param('sectionId') sectionId: string) {
        return this.service.fetchAnnouncements(sectionId);
    }
}
