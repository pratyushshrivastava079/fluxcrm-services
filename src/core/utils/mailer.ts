import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config';
import { logger } from './logger';

let _transport: Transporter | null = null;

function getTransport(): Transporter {
  if (!_transport) {
    _transport = nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      secure: config.SMTP_SECURE,
      auth:
        config.SMTP_USER && config.SMTP_PASS
          ? { user: config.SMTP_USER, pass: config.SMTP_PASS }
          : undefined,
    });
  }
  return _transport;
}

interface MailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export async function sendMail(opts: MailOptions): Promise<void> {
  const from = `"${config.SMTP_FROM_NAME}" <${config.SMTP_FROM_EMAIL}>`;
  try {
    await getTransport().sendMail({ from, ...opts });
    logger.info({ to: opts.to, subject: opts.subject }, 'Email sent');
  } catch (err) {
    logger.error({ err, to: opts.to, subject: opts.subject }, 'Email send failed');
    throw err;
  }
}

// ── Proposal-specific helpers ─────────────────────────────────────────────────

export async function sendProposalLink(opts: {
  to: string;
  recipientName: string;
  proposalSubject: string;
  publicUrl: string;
  senderName: string;
  expiresOn?: string | null;
}): Promise<void> {
  const { to, recipientName, proposalSubject, publicUrl, senderName, expiresOn } = opts;
  const expiry = expiresOn ? `<p>This proposal is valid until <strong>${expiresOn}</strong>.</p>` : '';

  await sendMail({
    to,
    subject: `Proposal: ${proposalSubject}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;">
        <h2 style="color:#3b82f6;">You've received a proposal</h2>
        <p>Hi ${recipientName},</p>
        <p>${senderName} has sent you a proposal titled <strong>${proposalSubject}</strong>.</p>
        ${expiry}
        <p style="margin:32px 0;">
          <a href="${publicUrl}" style="background:#3b82f6;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">
            View &amp; Sign Proposal
          </a>
        </p>
        <p style="color:#6b7280;font-size:12px;">
          If the button doesn't work, copy this link into your browser:<br/>
          <a href="${publicUrl}">${publicUrl}</a>
        </p>
      </div>
    `,
    text: `Hi ${recipientName},\n\n${senderName} sent you a proposal: ${proposalSubject}\n\nView it here: ${publicUrl}`,
  });
}
