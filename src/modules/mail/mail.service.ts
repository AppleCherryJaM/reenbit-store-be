// mail.service.ts
import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  // Уберите `| null` — это вызывает проблемы с типами
  private transporter?: nodemailer.Transporter; // ← опциональный тип
  private readonly logger = new Logger(MailService.name);

  constructor() {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      this.logger.warn('SMTP settings not configured. Email sending will be skipped.');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendVerificationEmail(email: string, name: string, token: string): Promise<void> {

    if (!this.transporter) {
      this.logger.warn(`Skipping email to ${email} (SMTP not configured)`);
      return;
    }

    const verificationUrl = `${process.env.FE_API_URL}/verify-email?token=${token}`;
    
    const mailOptions: nodemailer.SendMailOptions = {
      from: process.env.SMTP_FROM || '"Reenbit Store" <noreply@reenbit-store.com>',
      to: email,
      subject: 'Verify your email',
      html: `
        <h2>Welcome ${name}!</h2>
        <p>Please verify your email address by clicking the link below:</p>
        <a href="${verificationUrl}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">
          Verify Email
        </a>
        <p>This link will expire in 24 hours.</p>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Verification email sent to ${email}`);
    } catch (error) {
      this.logger.error('Failed to send email', (error as Error).message);
      throw error;
    }
  }
}