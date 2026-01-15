/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, Logger } from '@nestjs/common';

import sgMail from '@sendgrid/mail';
import { createEmailList, createEmailText } from './email.config';


@Injectable()
export class SendgridService {
  private readonly logger = new Logger(SendgridService.name);
  
  // ВРЕМЕННО используем другой подход, пока sender не подтверждён
  private readonly fromEmail = 'jamax.cherry@gmail.com';
  private readonly fromName = 'Freshnesecom';

  constructor() {
    const apiKey = process.env.SENDGRID_API_KEY;
    
    if (!apiKey) {
      this.logger.warn('SENDGRID_API_KEY not found. Emails will not be sent.');
      return;
    }

    if (typeof sgMail.setApiKey === 'function') {
      sgMail.setApiKey(apiKey);
      this.logger.log(`✅ SendGrid initialized`);
    } else if (sgMail && typeof sgMail === 'object') {
      (sgMail as any).setApiKey(apiKey);
      this.logger.log(`✅ SendGrid initialized (alternative)`);
    } else {
      this.logger.error('❌ sgMail object is invalid');
      throw new Error('SendGrid initialization failed');
    }
  }

  async sendVerificationEmail(email: string, name: string, token: string): Promise<void> {
    const verificationUrl = `${process.env.FE_API_URL}/verify-email?token=${token}`;

    this.logger.log(`📧 DEV MODE - Verification for ${email}: ${verificationUrl}`);

    if (!process.env.SENDGRID_API_KEY) {
      this.logger.warn('⚠️ SENDGRID_API_KEY not set. Email not sent.');
      return;
    }
    
    try {
      const msg = {
        to: email,
        from: {
          email: this.fromEmail,
          name: this.fromName,
        },
        subject: 'Verify Your Email',
        html: createEmailList(name, verificationUrl),
        text: createEmailText(name, verificationUrl),
      };

      await sgMail.send(msg);
      this.logger.log(`✅ Email sent to ${email}`);
      
    } catch (error: any) {

      if (error.code === 403 || error.response?.statusCode === 403) {
        this.logger.warn(`⚠️ Sender not verified. Please verify ${this.fromEmail} in SendGrid dashboard.`);
        this.logger.warn(`🔗 Verification URL for ${email}: ${verificationUrl}`);
      } else {
        this.logger.error(`❌ SendGrid error:`, error.message);
        throw error;
      }
    }
  }
}