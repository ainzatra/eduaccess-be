import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Put,
    UseGuards,
} from '@nestjs/common';
import { TodoService } from './todo.service';
import { AuthGuard } from '../auth/guard/auth.guard';
import { CreateTodoDto } from './dto/create-todo.dto';

@UseGuards(AuthGuard)
@Controller('todo')
export class TodoController {
    constructor(private readonly service: TodoService) {}

    @Post()
    create(@Body() body: CreateTodoDto) {
        return this.service.createTodo(body);
    }

    @Put(':id')
    toggleTodo(@Param('id') id: string) {
        return this.service.toggleTodo(id);
    }

    @Delete(':id')
    deleteTodo(@Param('id') id: string) {
        return this.service.deleteTodo(id);
    }

    @Get(':teacherId')
    fetchAll(@Param('teacherId') id: string) {
        return this.service.fetchAllById(id);
    }
}
