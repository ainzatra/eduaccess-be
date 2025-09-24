import { Module } from '@nestjs/common';
import { TodoController } from './todo.controller';
import { TodoService } from './todo.service';
import { ClsService } from 'nestjs-cls';

@Module({
    controllers: [TodoController],
    providers: [TodoService],
})
export class TodoModule {}
