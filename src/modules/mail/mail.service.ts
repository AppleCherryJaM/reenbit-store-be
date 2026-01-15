/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { createEmailList, createEmailText } from '../auth/sendgrid/email.config';

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    await this.initializeSmtp();
  }

  private async initializeSmtp(): Promise<void> {
    try {
      const host = this.configService.get<string>('SMTP_HOST', 'smtp.gmail.com');
      const port = this.configService.get<number>('SMTP_PORT', 587);
      const user = this.configService.get<string>('SMTP_USER');
      const pass = this.configService.get<string>('SMTP_PASS');

      if (!user || !pass) {
        this.logger.warn('SMTP credentials not found. Email sending will fail.');
        return;
      }

      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: false,
        requireTLS: true,
        auth: {
          user,
          pass,
        },
        tls: {
          rejectUnauthorized: false,
          minVersion: 'TLSv1.2'
        },
        debug: true, 
        logger: true,
      });

      await this.transporter.verify();
      this.logger.log(`✅ Email service ready: ${host}:${port}`);
    } catch (error) {
      this.logger.error('❌ Email service failed:', error.message);
    }
  }

  private getFromString(): string {
    const fromEmail = this.configService.get<string>('EMAIL_FROM') || 
                     this.configService.get<string>('SMTP_FROM') || 
                     'jamax.cherry@gmail.com';
    
    const fromName = this.configService.get<string>('EMAIL_FROM_NAME') || 
                    'Reenbit Store';
    
    return `"${fromName}" <${fromEmail}>`;
  }

  async sendVerificationEmail(email: string, name: string, token: string): Promise<void> {
    const verificationUrl = `${this.configService.get('FE_API_URL')}/verify-email?token=${token}`;
    
    const mailOptions = {
      from: this.getFromString(),
      to: email,
      subject: 'Verify your email address',
      html: createEmailList(name, verificationUrl),
      text: createEmailText(name, verificationUrl),
    };

    try {
      if (!this.transporter) {
        this.logger.error('Email transporter not ready');
        throw new Error('Email service not initialized');
      }
      
      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`✅ Email sent to ${email}: ${info.messageId}`);
    } catch (error) {
      this.logger.error(`❌ Failed to send email to ${email}:`, error.message);

      if (process.env.NODE_ENV !== 'production') {
        this.logger.warn(`DEV MODE - Verification URL: ${verificationUrl}`);
        this.logger.warn(`DEV MODE - Token: ${token}`);
      }
      
      throw error;
    }
  }

  async testConnection(): Promise<{ success: boolean; provider: string; error?: string }> {
    try {
      if (!this.transporter) {
        return { 
          success: false, 
          provider: 'SMTP', 
          error: 'Transporter not initialized' 
        };
      }
      
      await this.transporter.verify();
      return { success: true, provider: 'SMTP (Gmail)' };
    } catch (error) {
      return { 
        success: false, 
        provider: 'SMTP', 
        error: error.message 
      };
    }
  }
}