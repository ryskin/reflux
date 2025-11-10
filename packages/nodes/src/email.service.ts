/**
 * Email Node - Sends emails via SMTP
 * Supports HTML and plain text emails with attachments
 */
import { Service, ServiceBroker } from 'moleculer';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export default class EmailNode extends Service {
  private transporter: Transporter | null = null;

  constructor(broker: ServiceBroker) {
    super(broker);

    this.parseServiceSchema({
      name: '1.0.0.nodes.email.send',
      actions: {
        execute: {
          params: {
            to: 'string', // Recipient email address
            subject: 'string', // Email subject
            text: { type: 'string', optional: true }, // Plain text body
            html: { type: 'string', optional: true }, // HTML body
            from: { type: 'string', optional: true }, // Sender email (optional, uses default)
            cc: { type: 'string', optional: true }, // CC recipients
            bcc: { type: 'string', optional: true }, // BCC recipients
          },
          async handler(ctx: any) {
            const { to, subject, text, html, from, cc, bcc } = ctx.params;

            this.logger.info(`[Email] Sending email to: ${to}`);

            try {
              // Get or create transporter
              const transporter = this.getTransporter();

              // Send email
              const info = await transporter.sendMail({
                from: from || process.env.EMAIL_FROM || 'noreply@reflux.dev',
                to,
                cc,
                bcc,
                subject,
                text,
                html,
              });

              this.logger.info(`[Email] Email sent successfully: ${info.messageId}`);

              return {
                messageId: info.messageId,
                accepted: info.accepted,
                rejected: info.rejected,
                response: info.response,
              };
            } catch (error: any) {
              this.logger.error(`[Email] Failed to send email:`, error.message);
              throw new Error(`Email sending failed: ${error.message}`);
            }
          },
        },
      },
    });
  }

  /**
   * Get or create SMTP transporter
   * Uses environment variables for SMTP configuration
   */
  private getTransporter(): Transporter {
    if (!this.transporter) {
      const smtpHost = process.env.SMTP_HOST;
      const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;

      if (!smtpHost || !smtpUser || !smtpPass) {
        throw new Error(
          'SMTP configuration missing. Set SMTP_HOST, SMTP_USER, and SMTP_PASS environment variables.'
        );
      }

      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465, // true for 465, false for other ports
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      this.logger.info(`[Email] Created SMTP transporter: ${smtpHost}:${smtpPort}`);
    }

    return this.transporter;
  }
}
