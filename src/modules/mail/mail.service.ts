/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { createEmailList, createEmailText } from '../auth/sendgrid/email.config';

// ✅ Правильный импорт SendGrid
import sgMail from '@sendgrid/mail';

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private emailProvider: 'sendgrid' | 'smtp' = 'smtp';

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const sendgridKey = this.configService.get<string>('SENDGRID_API_KEY');
    
    if (sendgridKey) {
      this.emailProvider = 'sendgrid';
      sgMail.setApiKey(sendgridKey);
      this.logger.log('✅ Email service ready: SendGrid');
    } else {
      this.emailProvider = 'smtp';
      await this.initializeSmtp();
    }
  }

  private async initializeSmtp(): Promise<void> {
    try {
      const host = this.configService.get<string>('SMTP_HOST', 'smtp.gmail.com');
      const port = this.configService.get<number>('SMTP_PORT', 587);
      const user = this.configService.get<string>('SMTP_USER');
      const pass = this.configService.get<string>('SMTP_PASS');

      if (!user || !pass) {
        this.logger.warn('⚠️ SMTP credentials not found. Email sending will not work.');
        this.logger.warn('⚠️ Please add SENDGRID_API_KEY or SMTP credentials to .env');
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
        connectionTimeout: 10000,
        greetingTimeout: 10000,
      });

      await this.transporter.verify();
      this.logger.log(`✅ Email service ready: SMTP ${host}:${port}`);
    } catch (error: any) {
      this.logger.error('❌ SMTP initialization failed:', error.message);
    }
  }

  private getFromEmail(): string {
    return this.configService.get<string>('EMAIL_FROM') || 
           this.configService.get<string>('SMTP_FROM') || 
           'noreply@reenbitstore.com';
  }

  private getFromName(): string {
    return this.configService.get<string>('EMAIL_FROM_NAME') || 'Reenbit Store';
  }

  async sendVerificationEmail(email: string, name: string, token: string): Promise<void> {
    const verificationUrl = `${this.configService.get('FE_API_URL')}/verify-email?token=${token}`;
    
    // В DEV режиме просто логируем
    if (process.env.NODE_ENV === 'development') {
      this.logger.log(`📧 DEV: Verification for ${email}: ${verificationUrl}`);
      this.logger.log(`📧 DEV: Token: ${token}`);
      return;
    }
    
    // В PROD пытаемся отправить через SendGrid
    try {
      const msg = {
        to: email,
        from: {
          email: this.getFromEmail(),
          name: this.getFromName(),
        },
        subject: 'Verify your email address',
        html: createEmailList(name, verificationUrl),
        text: createEmailText(name, verificationUrl),
      };

      await sgMail.send(msg);
      this.logger.log(`✅ Email sent to ${email}`);
    } catch (error: any) {
      this.logger.error(`❌ Failed to send email to ${email}:`, error.message);
      
      // Даже в production логируем токен для ручной верификации
      this.logger.warn(`🔗 Manual verification for ${email}: ${verificationUrl}`);
      
      // НЕ бросаем ошибку - позволяем регистрации продолжиться
      return;
    }
  }

  private async sendViaSendGrid(email: string, name: string, verificationUrl: string): Promise<void> {
    const msg = {
      to: email,
      from: {
        email: this.getFromEmail(),
        name: this.getFromName(),
      },
      subject: 'Verify your email address',
      html: createEmailList(name, verificationUrl),
      text: createEmailText(name, verificationUrl),
    };

    await sgMail.send(msg);
  }

  private async sendViaSmtp(email: string, name: string, verificationUrl: string): Promise<void> {
    if (!this.transporter) {
      throw new Error('SMTP transporter not initialized');
    }

    const mailOptions = {
      from: `"${this.getFromName()}" <${this.getFromEmail()}>`,
      to: email,
      subject: 'Verify your email address',
      html: createEmailList(name, verificationUrl),
      text: createEmailText(name, verificationUrl),
    };

    await this.transporter.sendMail(mailOptions);
  }

  async testConnection(): Promise<{ success: boolean; provider: string; error?: string }> {
    try {
      if (this.emailProvider === 'sendgrid') {
        const hasKey = !!this.configService.get<string>('SENDGRID_API_KEY');
        return { 
          success: hasKey, 
          provider: 'SendGrid',
          error: hasKey ? undefined : 'API key not configured'
        };
      } else {
        if (!this.transporter) {
          return { 
            success: false, 
            provider: 'SMTP', 
            error: 'Transporter not initialized' 
          };
        }
        
        await this.transporter.verify();
        return { success: true, provider: 'SMTP (Gmail)' };
      }
    } catch (error: any) {
      return { 
        success: false, 
        provider: this.emailProvider === 'sendgrid' ? 'SendGrid' : 'SMTP', 
        error: error.message 
      };
    }
  }
}