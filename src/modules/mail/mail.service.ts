/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { createEmailList } from './email-list';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    try {
      this.transporter = nodemailer.createTransport({
        host: this.configService.get('SMTP_HOST'),
        port: this.configService.get('SMTP_PORT'),
        secure: false, // true for 465, false for other ports
        auth: {
          user: this.configService.get('SMTP_USER'),
          pass: this.configService.get('SMTP_PASS'),
        },
      });

      this.logger.log('Mail transporter initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize mail transporter:', error);
    }
  }

  async sendVerificationEmail(email: string, name: string, token: string): Promise<void> {
    try {
      const verificationUrl = `${process.env.FE_API_URL}/verify-email?token=${token}`;
      
      const mailOptions = {
        from: this.configService.get('SMTP_FROM') || '"Reenbit Store" <noreply@reenbit-store.com>',
        to: email,
        subject: 'Verify your email address',
        html: createEmailList(name, verificationUrl),
        text: `Welcome to Reenbit Store, ${name}!\n\nPlease verify your email address by visiting: ${verificationUrl}\n\nThis link will expire in 24 hours.\n\nIf you did not create an account, please ignore this email.`,
      };

      const info = await this.transporter.sendMail(mailOptions);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      this.logger.log(`Verification email sent to ${email}: ${info.messageId}`);
      
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${email}:`, error);
    }
  }
  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      this.logger.log('SMTP connection verified successfully');
      return true;
    } catch (error) {
      this.logger.error('SMTP connection failed:', error);
      return false;
    }
  }
}