import {
    Body,
    Controller,
    Get,
    Param,
    Post,
    Put,
    UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/guard/auth.guard';
import { NarrativeReportService } from './narrative-report.service';
import { CreateNarrativeReportDto } from './dto/create-narrative-report.dto';
import { UpdateNarrativeReportDto } from './dto/update-narrative-report.dto';
import { ClsService } from 'nestjs-cls';

@Controller('narrative-report')
@UseGuards(AuthGuard)
export class NarrativeReportController {
    constructor(
        private readonly narrativeReportService: NarrativeReportService,
        private readonly cls: ClsService,
    ) {}

    @Post()
    createReport(@Body() createReportDto: CreateNarrativeReportDto) {
        return this.narrativeReportService.createReport(createReportDto);
    }

    @Get('settings')
    getReportSettings() {
        return this.narrativeReportService.getReportSettings();
    }

    @Put('settings')
    updateReportSettings(@Body('principal') principal: string) {
        return this.narrativeReportService.updateReportSettings(principal);
    }

    @Get('student/:studentId')
    getReportByStudent(@Param('studentId') studentId: string) {
        return this.narrativeReportService.getReportByStudent(studentId);
    }

    @Get('section/:sectionId')
    getReportsBySection(@Param('sectionId') sectionId: string) {
        return this.narrativeReportService.getReportsBySection(sectionId);
    }

    @Get('student-info/:studentId')
    getStudentInfo(@Param('studentId') studentId: string) {
        return this.narrativeReportService.getStudentInfo(studentId);
    }

    @Get(':reportId')
    getReportById(@Param('reportId') reportId: string) {
        return this.narrativeReportService.getReportById(reportId);
    }

    @Put(':reportId')
    updateReport(
        @Param('reportId') reportId: string,
        @Body() updateReportDto: UpdateNarrativeReportDto,
    ) {
        return this.narrativeReportService.updateReport(
            reportId,
            updateReportDto,
        );
    }
}
