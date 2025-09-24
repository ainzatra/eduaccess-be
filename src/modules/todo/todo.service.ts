import {
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { PrismaService } from 'src/modules/prisma/prisma.service';
import { CreateTodoDto } from './dto/create-todo.dto';

@Injectable()
export class TodoService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly cls: ClsService,
    ) {}

    async fetchAllById(teacherId: string) {
        return this.prisma.todo.findMany({
            where: { teacher_id: teacherId },
            orderBy: { title: 'asc' },
        });
    }

    async deleteTodo(id: string) {
        const { id: userId, role } = await this.cls.get('auth');

        if (role !== 'teacher') throw new UnauthorizedException();

        return this.prisma.todo.delete({
            where: {
                id,
                teacher_id: userId,
            },
        });
    }

    async toggleTodo(id: string) {
        const { id: userId, role } = await this.cls.get('auth');

        if (role !== 'teacher') throw new UnauthorizedException();

        const todo = await this.prisma.todo.findUnique({
            where: { id, teacher_id: userId },
            select: { completed: true },
        });

        if (!todo) throw new NotFoundException();

        return this.prisma.todo.update({
            where: { id, teacher_id: userId },
            data: {
                completed: !todo.completed,
            },
        });
    }

    async createTodo(data: CreateTodoDto) {
        const { id: userId, role } = await this.cls.get('auth');

        if (role !== 'teacher') throw new UnauthorizedException();

        return this.prisma.todo.create({
            data,
        });
    }
}
