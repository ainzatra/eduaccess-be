import {
    HttpException,
    HttpStatus,
    Injectable,
    UnauthorizedException,
    NotFoundException,
} from '@nestjs/common';
import { LoginAuthDto } from './dto/login-auth.dto';
import * as bcrypt from 'bcrypt';
import { User } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { ClsService } from 'nestjs-cls';
import { PrismaService } from 'src/modules/prisma/prisma.service';
import { EmailService } from '../email/email.service';

type TokenPayload = {
    token: string;
    id: string;
    username: string;
    role: string;
    avatar: string | null;
    full_name: string;
};

@Injectable()
export class AuthService {
    constructor(
        private readonly cls: ClsService,
        private readonly service: UsersService,
        private readonly jwtService: JwtService,
        private readonly prisma: PrismaService,
        private readonly emailService: EmailService,
    ) {}

    async login(data: LoginAuthDto) {
        const user = await this.service.findByUsername(data.username);

        if (!user) {
            throw new UnauthorizedException('Invalid username or password');
        }
        const isPasswordValid = await bcrypt.compare(
            data.password,
            user.password_hash,
        );

        if (!isPasswordValid)
            throw new UnauthorizedException('Invalid username or password');

        const payload = await this.generateJWT(user);
        console.log('login', payload);
        return { message: 'Login success', ...payload };
    }

    async generateJWT(user: User): Promise<TokenPayload> {
        const tokenPayload = {
            sub: user.id,
            username: user.username,
            name: user.full_name,
            role: user.role,
            avatar: user.avatar,
            full_name: user.full_name,
        };

        const token = await this.jwtService.signAsync(tokenPayload);

        return {
            token,
            id: user.id,
            username: user.username,
            role: user.role,
            avatar: user.avatar,
            full_name: user.full_name,
        };
    }

    async verifyJwtToken(token: string): Promise<TokenPayload> {
        const result = await this.jwtService.decode(token);
        const user = await this.service.findOne(result.sub);
        // create new token to update new user info
        const tokenPayload = {
            sub: user.id,
            username: user.username,
            name: user.full_name,
            role: user.role,
            avatar: user.avatar,
            full_name: user.full_name,
        };
        const newToken = await this.jwtService.signAsync(tokenPayload);
        return {
            token: newToken,
            id: user.id,
            username: user.username,
            role: user.role,
            avatar: user.avatar,
            full_name: user.full_name,
        };
    }

    async refresh(): Promise<TokenPayload> {
        const auth = this.cls.get('auth');
        const result = await this.verifyJwtToken(auth.token);

        if (!result) {
            throw new UnauthorizedException('Invalid Token');
        }

        return result;
    }

    async sendResetOtp(email: string) {
        // Find user directly by email (for teachers/admins)
        let targetUser = await this.prisma.user.findUnique({
            where: { email },
        });

        let emailTo = email;

        if (
            !targetUser ||
            (targetUser.role !== 'teacher' && targetUser.role !== 'admin')
        ) {
            // If not found or not teacher/admin, check if it's a guardian's email
            const guardian = await this.prisma.guardian.findUnique({
                where: { email },
                include: { student: true },
            });

            if (!guardian) {
                throw new NotFoundException(
                    'No user associated with this email',
                );
            }

            targetUser = guardian.student;
            emailTo = email; // Still send to guardian's email
        }

        // Delete old unused OTPs for this user
        await this.prisma.resetOtp.deleteMany({
            where: {
                user_id: targetUser.id,
                used: false,
            },
        });

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Set expiration to 10 minutes from now
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        // Create new OTP record
        await this.prisma.resetOtp.create({
            data: {
                otp,
                user_id: targetUser.id,
                expiresAt,
                used: false,
            },
        });

        // Send email with OTP
        await this.emailService.sendPasswordResetEmail(emailTo, otp);

        return { message: 'Reset OTP sent successfully' };
    }

    async verifyOtp(email: string, otp: string) {
        // Find target user same as in sendResetOtp
        let targetUser = await this.prisma.user.findUnique({
            where: { email },
        });

        if (
            !targetUser ||
            (targetUser.role !== 'teacher' && targetUser.role !== 'admin')
        ) {
            const guardian = await this.prisma.guardian.findUnique({
                where: { email },
                include: { student: true },
            });

            if (!guardian) {
                throw new NotFoundException(
                    'No user associated with this email',
                );
            }

            targetUser = guardian.student;
        }

        // Find the OTP record without marking used
        const resetOtp = await this.prisma.resetOtp.findFirst({
            where: {
                user_id: targetUser.id,
                otp,
                used: false,
                expiresAt: {
                    gt: new Date(),
                },
            },
        });

        if (!resetOtp) {
            throw new UnauthorizedException('Invalid or expired OTP');
        }

        return { valid: true };
    }

    async resetPassword(email: string, otp: string, newPassword: string) {
        // Find target user same as in sendResetOtp
        let targetUser = await this.prisma.user.findUnique({
            where: { email },
        });

        if (
            !targetUser ||
            (targetUser.role !== 'teacher' && targetUser.role !== 'admin')
        ) {
            const guardian = await this.prisma.guardian.findUnique({
                where: { email },
                include: { student: true },
            });

            if (!guardian) {
                throw new NotFoundException(
                    'No user associated with this email',
                );
            }

            targetUser = guardian.student;
        }

        // Find the OTP record
        const resetOtp = await this.prisma.resetOtp.findFirst({
            where: {
                user_id: targetUser.id,
                otp,
                used: false,
                expiresAt: {
                    gt: new Date(),
                },
            },
        });

        if (!resetOtp) {
            throw new UnauthorizedException('Invalid or expired OTP');
        }

        // Hash the new password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        // Update user password and mark OTP as used
        await this.prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: targetUser.id },
                data: { password_hash: hashedPassword },
            });

            await tx.resetOtp.update({
                where: { id: resetOtp.id },
                data: { used: true },
            });
        });

        return { message: 'Password reset successfully' };
    }
}
