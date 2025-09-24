import { Injectable } from '@nestjs/common';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
@Injectable()
export class EmailService {
    private sesClient;
    private emailDomain;

    constructor() {
        this.sesClient = new SESClient({
            region: process.env.AWS_REGION,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
            },
        });

        this.emailDomain = process.env.EMAIL_DOMAIN;
    }
    private async sendEmail(
        to: string,
        subject: string,
        htmlBody: string,
        fromLocal: string = 'no-reply',
    ): Promise<void> {
        const source = `${fromLocal}@${this.emailDomain}`;
        console.log({ source });
        const command = new SendEmailCommand({
            Source: source,
            Destination: {
                ToAddresses: [to],
            },
            Message: {
                Subject: {
                    Data: subject,
                },
                Body: {
                    Html: {
                        Data: htmlBody,
                    },
                },
            },
        });

        try {
            await this.sesClient.send(command);
        } catch (error) {
            console.error('Error sending email:', error);
            throw error;
        }
    }
    private getEmailTemplate(content: string, title: string): string {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table role="presentation" style="width: 100%; border-collapse: collapse; border: 0; border-spacing: 0; background-color: #f4f4f4; padding: 20px;">
        <tr>
            <td align="center" style="padding: 20px 0;">
                <table role="presentation" style="width: 600px; border-collapse: collapse; border: 0; border-spacing: 0; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <tr>
                        <td style="padding: 40px 30px 30px; text-align: center; background-color: #4a90e2; color: #ffffff;">
                            <h1 style="margin: 0; font-size: 24px; font-weight: bold; color: #ffffff;">EduAccess</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 30px; text-align: left; color: #333333; line-height: 1.6;">
                            <h2 style="margin-top: 0; font-size: 20px; color: #333333;">${title}</h2>
                            ${content}
                            <p style="margin: 20px 0 0; font-size: 14px; color: #666666;">Best regards,<br>The EduAccess Team</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 20px 30px; text-align: center; background-color: #f8f9fa; color: #666666; font-size: 12px;">
                            <p style="margin: 0;">This is an automated email. Please do not reply.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        `;
    }

    async sendWelcomeEmail(to: string, name: string) {
        const title = 'Welcome to EduAccess!';
        const content = `
            <p>Dear ${name},</p>
            <p>Thank you for joining EduAccess. We're excited to have you on board!</p>
            <p>Get started by exploring your dashboard and discovering new learning opportunities.</p>
        `;
        const htmlBody = this.getEmailTemplate(content, title);
        await this.sendEmail(to, title, htmlBody, 'no-reply');
    }

    async sendPasswordResetEmail(to: string, otp: string) {
        const title = 'Password Reset OTP';
        const content = `
            <p>You requested a password reset. Your one-time password (OTP) is: <strong style="color: #4a90e2;">${otp}</strong></p>
            <p>If you didn't request this, please ignore this email.</p>
        `;
        const htmlBody = this.getEmailTemplate(content, title);
        await this.sendEmail(to, title, htmlBody, 'no-reply');
    }

    async sendNotificationEmail(to: string, subject: string, message: string) {
        const title = subject;
        const content = `
            <p>${message}</p>
        `;
        const htmlBody = this.getEmailTemplate(content, title);
        await this.sendEmail(to, title, htmlBody, 'notifications');
    }
}
