import { getConfig } from '../config/index.js';
import { logger } from '../logger.js';

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

/**
 * Transactional email abstraction.
 * Routes to console (dev), SendGrid, or Resend based on config.
 */
export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const config = getConfig();
  const from = options.from ?? config.EMAIL_FROM;

  switch (config.EMAIL_PROVIDER) {
    case 'console':
      logger.info(
        { to: options.to, subject: options.subject, from },
        '📧 [Console Email] Would send email',
      );
      break;

    case 'sendgrid': {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: Array.isArray(options.to) ? options.to.map((e) => ({ email: e })) : [{ email: options.to }] }],
          from: { email: from },
          subject: options.subject,
          content: [{ type: 'text/html', value: options.html }],
        }),
      });
      if (!response.ok) {
        throw new Error(`SendGrid error: ${response.status} ${await response.text()}`);
      }
      break;
    }

    case 'resend': {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: Array.isArray(options.to) ? options.to : [options.to],
          subject: options.subject,
          html: options.html,
        }),
      });
      if (!response.ok) {
        throw new Error(`Resend error: ${response.status} ${await response.text()}`);
      }
      break;
    }
  }
}

/**
 * Render a Handlebars template with data.
 */
export async function renderEmailTemplate(
  templateName: string,
  data: Record<string, unknown>,
): Promise<string> {
  const Handlebars = await import('handlebars');
  // In production, templates would be loaded from disk/S3
  // For now, use a simple placeholder pattern
  const template = Handlebars.default.compile(`<!-- Template: ${templateName} -->{{#each this}}<p>{{@key}}: {{this}}</p>{{/each}}`);
  return template(data);
}
