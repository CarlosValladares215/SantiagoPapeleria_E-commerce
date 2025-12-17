
import { Injectable } from '@nestjs/common';

@Injectable()
export class EmailService {
    async sendVerificationEmail(email: string, token: string) {
        const verificationLink = `https://your-domain.com/verify-email?token=${token}`;
        console.log(`[EmailService] Send email to ${email} with link: ${verificationLink}`);
        // Here you would integrate with a real SMTP service like Nodemailer or SendGrid
    }
}
