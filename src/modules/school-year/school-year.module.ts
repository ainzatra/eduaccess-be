import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { SchoolYearService } from './school-year.service';
import { SchoolYearController } from './school-year.controller';
import { SchoolYearMiddleware } from './school-year.middleware';
import { SchoolYearTransitionService } from './school-year-transition.service';

@Module({
    controllers: [SchoolYearController],
    providers: [SchoolYearService, SchoolYearTransitionService],
    exports: [SchoolYearService, SchoolYearTransitionService],
})
export class SchoolYearModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(SchoolYearMiddleware).forRoutes('*');
    }
}
