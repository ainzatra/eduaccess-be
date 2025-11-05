import {
    Controller,
    Get,
    Param,
    UseGuards,
    Req,
    NotFoundException,
} from '@nestjs/common';
import { StudentProgressService } from './student-progress.service';
import { AuthGuard } from '../auth/guard/auth.guard';
import type { SchoolYearRequest } from '../school-year/school-year.middleware';

// @UseGuards(AuthGuard)
@Controller('student-progress')
export class StudentProgressController {
    constructor(
        private readonly studentProgressService: StudentProgressService,
    ) {}

    @Get('/section/:sectionId/subject/:subjectId')
    async getSectionProgressBySubject(
        @Param('sectionId') sectionId: string,
        @Param('subjectId') subjectId: string,
        @Req() req: SchoolYearRequest,
    ) {
        return this.studentProgressService.getSectionProgressBySubject(
            sectionId,
            subjectId,
            req,
        );
    }
    @Get('student/:studentId')
    async getStudentProgress(
        @Param('studentId') studentId: string,
        @Req() req: SchoolYearRequest,
    ) {
        return this.studentProgressService.getStudentProgress(studentId, req);
    }

    @Get('student/:studentId/subject/:subjectId')
    async getStudentProgressBySubject(
        @Param('studentId') studentId: string,
        @Param('subjectId') subjectId: string,
        @Req() req: SchoolYearRequest,
    ) {
        return this.studentProgressService.getStudentProgressBySubject(
            studentId,
            subjectId,
            req,
        );
    }

    @Get('student/:studentId/subject/:subjectId/details')
    async getProgressWithDetails(
        @Param('studentId') studentId: string,
        @Param('subjectId') subjectId: string,
        @Req() req: SchoolYearRequest,
    ) {
        return this.studentProgressService.getProgressWithDetails(
            studentId,
            subjectId,
            req,
        );
    }
    @Get('student/:studentId/details')
    async getAllProgressWithDetails(
        @Param('studentId') studentId: string,
        @Req() req: SchoolYearRequest,
    ) {
        return this.studentProgressService.getAllStudentProgressWithDetails(
            studentId,
            req,
        );
    }

    @Get('student/:studentId/available-activities/:subjectId')
    async getAvailableActivities(
        @Param('studentId') studentId: string,
        @Param('subjectId') subjectId: string,
        @Req() req: SchoolYearRequest,
    ) {
        return this.studentProgressService.getAvailableActivities(
            studentId,
            subjectId,
            req,
        );
    }

    @Get('student/:studentId/can-access/:activityId')
    async canAccessActivity(
        @Param('studentId') studentId: string,
        @Param('activityId') activityId: string,
        @Req() req: SchoolYearRequest,
    ) {
        try {
            const canAccess =
                await this.studentProgressService.canAccessActivity(
                    studentId,
                    activityId,
                    req,
                );
            return { canAccess };
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            return { canAccess: false, error: error.message };
        }
    }
}
