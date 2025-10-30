import { Injectable, NestMiddleware, NotFoundException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { SchoolYearService } from './school-year.service';

export interface SchoolYearRequest extends Request {
    schoolYear?: string;
}

@Injectable()
export class SchoolYearMiddleware implements NestMiddleware {
    constructor(private readonly schoolYearService: SchoolYearService) {}

    async use(req: SchoolYearRequest, res: Response, next: NextFunction) {
        try {
            // Check if school year is specified in headers
            // const schoolYearHeader = req.headers['x-school-year'] as string;

            // if (schoolYearHeader) {
            //     req.schoolYear = schoolYearHeader;
            // } else {
            //     // Default to active school year
            //     const activeSchoolYear =
            //         await this.schoolYearService.getActiveSchoolYear();
            //     req.schoolYear = activeSchoolYear.year;
            // }

            // Default to active school year
            const activeSchoolYear =
                await this.schoolYearService.getActiveSchoolYear();
            req.schoolYear = activeSchoolYear.year;
            next();
        } catch (error) {
            if (error instanceof NotFoundException) {
                // If no active school year exists, set a default
                req.schoolYear = '2025-2026';
                next();
            } else {
                throw error;
            }
        }
    }
}
