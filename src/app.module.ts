import { Module } from '@nestjs/common';
import { ClsModule, ClsService } from 'nestjs-cls';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuthInterceptor } from './modules/auth/auth.interceptor';
import { UsersModule } from './modules/users/users.module';
import { ZenstackModule } from './zenstack.module';
import { AuthModule } from './modules/auth/auth.module';
import { SectionModule } from './modules/section/section.module';
import { SubjectModule } from './modules/subject/subject.module';
import { GuardianModule } from './modules/guardian/guardian.module';
import { TodoModule } from './modules/todo/todo.module';
import { StudentModule } from './modules/student/student.module';
import { TeacherModule } from './modules/teacher/teacher.module';
import { LessonModule } from './modules/lesson/lesson.module';
import { ActivityModule } from './modules/activity/activity.module';
import { NotificationModule } from './modules/notification/notification.module';
import { EmailModule } from './modules/email/email.module';
import { AnnouncementModule } from './modules/announcement/announcement.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { NarrativeReportModule } from './modules/narrative-report/narrative-report.module';
import { LearningMaterialModule } from './modules/learning-material/learning-material.module';
import { SchoolYearModule } from './modules/school-year/school-year.module';

@Module({
    imports: [
        ClsModule.forRoot({
            global: true,
            middleware: {
                mount: true,
            },
        }),
        UsersModule,
        ZenstackModule,
        AuthModule,
        SectionModule,
        SubjectModule,
        GuardianModule,
        TodoModule,
        StudentModule,
        TeacherModule,
        LessonModule,
        ActivityModule,
        NotificationModule,
        EmailModule,
        AnnouncementModule,
        PrismaModule,
        NarrativeReportModule,
        LearningMaterialModule,
        SchoolYearModule,
    ],
    controllers: [],
    providers: [
        {
            provide: APP_INTERCEPTOR,
            useClass: AuthInterceptor,
        },
    ],
})
export class AppModule {}
