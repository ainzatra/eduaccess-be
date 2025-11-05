import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Param,
    Body,
    UseGuards,
    Req,
} from '@nestjs/common';
import { ProgressLevelService } from './progress-level.service';
import { AuthGuard } from '../auth/guard/auth.guard';
import { ActivityLevel } from '@prisma/client';
import type { SchoolYearRequest } from '../school-year/school-year.middleware';

// @UseGuards(AuthGuard)
@Controller('progress-levels')
export class ProgressLevelController {
    constructor(private readonly progressLevelService: ProgressLevelService) {}

    @Get()
    async getProgressLevels(@Req() req: SchoolYearRequest) {
        return this.progressLevelService.getProgressLevels(req);
    }

    @Get(':id')
    async getProgressLevelById(@Param('id') id: string) {
        return this.progressLevelService.getProgressLevelById(id);
    }

    @Get('level/:level')
    async getProgressLevelByLevel(
        @Param('level') level: ActivityLevel,
        @Req() req: SchoolYearRequest,
    ) {
        return this.progressLevelService.getProgressLevelByLevel(level, req);
    }

    @Post()
    async createProgressLevel(
        @Body()
        body: {
            level: ActivityLevel;
            minPoints: number;
            maxPoints: number;
            pointValue: number;
        },
        @Req() req: SchoolYearRequest,
    ) {
        return this.progressLevelService.createProgressLevel(body, req);
    }

    @Put(':id')
    async updateProgressLevel(
        @Param('id') id: string,
        @Body()
        body: {
            level?: ActivityLevel;
            minPoints?: number;
            maxPoints?: number;
            pointValue?: number;
        },
    ) {
        return this.progressLevelService.updateProgressLevel(id, body);
    }

    @Delete(':id')
    async deleteProgressLevel(@Param('id') id: string) {
        return this.progressLevelService.deleteProgressLevel(id);
    }

    @Post('seed')
    async seedDefaultProgressLevels(@Req() req: SchoolYearRequest) {
        return this.progressLevelService.seedDefaultProgressLevels(req);
    }
}
