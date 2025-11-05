import { Module } from '@nestjs/common';
import { StudentController } from './student.controller';
import { StudentService } from './student.service';
import { StudentProgressModule } from '../student-progress/student-progress.module';

@Module({
    imports: [StudentProgressModule],
    controllers: [StudentController],
    providers: [StudentService],
})
export class StudentModule {}
