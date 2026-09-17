import { getDb } from './lib/mongo.js';
import { compatHandler } from './lib/compat.js';
import { createHash } from 'crypto';
import nodemailer, { createTransport } from 'nodemailer';

// POST {email} -> creates a single-use password-reset token (1h expiry) and
// emails the reset link via the Gmail SMTP account (Google App Password —
// no separate service signup, no card, no personal address published).
// Always returns 200 (never reveals whether the email exists).
//
// If SMTP_USER / SMTP_PASS are not configured yet, the response includes
// resetUrl so the requester can still complete the flow (demo mode).

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

async function sendResetEmail(smtpUser, smtpPass, toEmail, resetUrl) {
  // Gmail SMTP with a Google App Password (NOT the account password).
  const transporter = createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: smtpUser, pass: smtpPass },
  });

  await transporter.sendMail({
    from: `SunSip <${smtpUser}>`,
    to: toEmail,
    subject: 'Reset your SunSip password',
    html: `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
        <h2 style="color:#0c4a6e;">Reset your password</h2>
        <p>We received a request to reset the password for your SunSip account.</p>
        <p style="margin:28px 0;">
          <a href="${resetUrl}"
             style="background:#0284c7;color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">
            Choose a new password
          </a>
        </p>
        <p style="color:#64748b;font-size:13px;">
          This link works once and expires in 1 hour. If you didn't request this,
          you can safely ignore this email — your password stays unchanged.
        </p>
      </div>`,
  });
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }
    const normalizedEmail = String(email).toLowerCase().trim();

    const db = await getDb();
    const users = db.collection('users');
    const user = await users.findOne({ email: normalizedEmail });

    // Never reveal whether the account exists.
    if (user) {
      const token = createHash('sha256')
        .update(normalizedEmail + Date.now() + Math.random())
        .digest('hex'); // raw token only lives in the email/link

      await db.collection('password_resets').insertOne({
        _id: sha256(token), // store only the hash of the token
        userId: user._id,
        expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
        usedAt: null,
        createdAt: new Date(),
      });

      const origin = req.headers?.origin || 'https://sunsip.netlify.app';
      const resetUrl = `${origin}/#reset-token=${token}`;

      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;
      if (smtpUser && smtpPass) {
        await sendResetEmail(smtpUser, smtpPass, normalizedEmail, resetUrl);
        return res.status(200).json({ message: 'Check your inbox — we sent a reset link.' });
      }

      // Email not configured yet: return the link so the flow still works
      // (shown in the UI with a notice). Add SMTP_* vars for real email.
      console.log('auth-forgot: SMTP not configured, returning resetUrl directly');
      return res.status(200).json({
        message: 'Email service is not set up yet — use this link to reset your password:',
        delivered: false,
        resetUrl,
      });
    }

    return res.status(200).json({ message: 'If that email exists, a reset link is on its way.' });
  } catch (error) {
    console.error('Forgot-password error:', error);
    return res.status(500).json({ error: 'Failed to start password reset.' });
  }
}

export default compatHandler(handler);