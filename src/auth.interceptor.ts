import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
  } from '@nestjs/common';
  import { ClsService } from 'nestjs-cls';
  
  @Injectable()
  export class AuthInterceptor implements NestInterceptor {
    constructor(private readonly cls: ClsService) {}
  
    async intercept(context: ExecutionContext, next: CallHandler) {
      const request = context.switchToHttp().getRequest();
      const userId = request.headers['x-user-id'];
      if (userId) {
        this.cls.set('auth', { id: Number(userId) });
      }
      return next.handle();
    }
  }