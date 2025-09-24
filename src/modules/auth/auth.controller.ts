import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginAuthDto } from './dto/login-auth.dto';

@Controller('auth')
export class AuthController {
    constructor(private readonly service: AuthService) {}

    @Post('login')
    async login(@Body() data: LoginAuthDto) {
        return this.service.login(data);
    }

    @Get('me')
    async refresh() {
        return this.service.refresh();
    }

    @Get('send-otp')
    async sendResetOtp(@Query('email') email: string) {
        return this.service.sendResetOtp(email);
    }

    @Post('verify-otp')
    async verifyOtp(@Body() body: { email: string; otp: string }) {
        return this.service.verifyOtp(body.email, body.otp);
    }

    @Post('reset-password')
    async resetPassword(
        @Body() body: { email: string; otp: string; newPassword: string },
    ) {
        return this.service.resetPassword(
            body.email,
            body.otp,
            body.newPassword,
        );
    }
}
