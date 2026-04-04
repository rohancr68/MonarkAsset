require('dotenv').config();
const express    = require('express');
const nodemailer = require('nodemailer');
const cors       = require('cors');

const app  = express();
const PORT = process.env.PORT || 3002;

// ── Middleware ──────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── GoDaddy SMTP Transporter ────────────────────────────────
const transporter = nodemailer.createTransport({
  host:   'smtpout.secureserver.net',
  port:   587,
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

// Test connection on startup
transporter.verify((err) => {
  if (err) console.error('❌  Mail config error:', err.message);
  else     console.log('✅  GoDaddy SMTP connected');
});

// ── POST /api/contact ────────────────────────────────────────
app.post('/api/contact', async (req, res) => {
  const { firstName, lastName, email, phone, profile, service, message } = req.body;

  if (!firstName || !email) {
    return res.status(400).json({ success: false, error: 'Name and email are required.' });
  }

  // ── Advisor notification email ──
  const advisorMail = {
    from:    `"MonarkAsset Website" <${process.env.MAIL_USER}>`,
    to:      process.env.MAIL_TO,
    replyTo: email,
    subject: `New Enquiry — ${firstName} ${lastName}`,
    html: `
      <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;color:#1D3B1A;">
        <div style="background:#1D3B1A;padding:24px 32px;">
          <h1 style="color:#F0EDE4;font-size:22px;font-weight:300;margin:0;letter-spacing:0.04em;">MonarkAsset</h1>
          <p style="color:#B8930F;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;margin:4px 0 0;">New Client Enquiry</p>
        </div>
        <div style="background:#F7F4EE;padding:32px;">
          <table style="width:100%;border-collapse:collapse;">
            <tr style="border-bottom:1px solid #E4E0D5;">
              <td style="padding:12px 0;color:#6A8F67;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;width:140px;">Name</td>
              <td style="padding:12px 0;font-weight:bold;font-size:15px;">${firstName} ${lastName}</td>
            </tr>
            <tr style="border-bottom:1px solid #E4E0D5;">
              <td style="padding:12px 0;color:#6A8F67;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;">Email</td>
              <td style="padding:12px 0;"><a href="mailto:${email}" style="color:#1D3B1A;">${email}</a></td>
            </tr>
            <tr style="border-bottom:1px solid #E4E0D5;">
              <td style="padding:12px 0;color:#6A8F67;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;">Phone</td>
              <td style="padding:12px 0;">${phone || '—'}</td>
            </tr>
            <tr style="border-bottom:1px solid #E4E0D5;">
              <td style="padding:12px 0;color:#6A8F67;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;">Profile</td>
              <td style="padding:12px 0;">${profile || '—'}</td>
            </tr>
            <tr style="border-bottom:1px solid #E4E0D5;">
              <td style="padding:12px 0;color:#6A8F67;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;">Service</td>
              <td style="padding:12px 0;">${service || '—'}</td>
            </tr>
            <tr>
              <td style="padding:12px 0;color:#6A8F67;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;vertical-align:top;">Message</td>
              <td style="padding:12px 0;">${message || '—'}</td>
            </tr>
          </table>
          <p style="margin-top:20px;font-size:11px;color:#6A8F67;">
            Reply directly to this email to respond to ${firstName}.
          </p>
        </div>
      </div>
    `,
  };

  // ── Auto-reply to visitor ──
  const autoReply = {
    from:    `"MonarkAsset" <${process.env.MAIL_USER}>`,
    to:      email,
    subject: `We've received your enquiry — MonarkAsset`,
    html: `
      <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;color:#1D3B1A;">
        <div style="background:#1D3B1A;padding:24px 32px;">
          <h1 style="color:#F0EDE4;font-size:22px;font-weight:300;margin:0;letter-spacing:0.04em;">MonarkAsset</h1>
          <p style="color:#B8930F;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;margin:4px 0 0;">Private Wealth Management</p>
        </div>
        <div style="background:#F7F4EE;padding:32px;">
          <p style="font-size:16px;line-height:1.7;margin:0 0 16px;">Dear ${firstName},</p>
          <p style="font-size:15px;line-height:1.8;color:#4A7A46;margin:0 0 16px;">
            Thank you for reaching out to MonarkAsset. We have received your enquiry and one of our advisors will be in touch within <strong style="color:#1D3B1A;">24 hours</strong>.
          </p>
          <p style="font-size:14px;line-height:1.8;color:#6A8F67;margin:0 0 24px;">
            For urgent queries, call us at <strong style="color:#1D3B1A;">+91 80 4567 8900</strong>.
          </p>
          <div style="border-left:3px solid #B8930F;padding:12px 16px;background:#F0EDE4;margin-bottom:24px;">
            <p style="margin:0;font-size:13px;color:#6A8F67;">Your enquiry reference:</p>
            <p style="margin:4px 0 0;font-size:13px;color:#1D3B1A;"><strong>${service || 'General Enquiry'}</strong></p>
          </div>
          <p style="font-size:14px;line-height:1.7;color:#4A7A46;margin:0;">
            Warm regards,<br>
            <strong style="color:#1D3B1A;">The MonarkAsset Advisory Team</strong>
          </p>
        </div>
        <div style="background:#E4E0D5;padding:16px 32px;text-align:center;">
          <p style="font-size:11px;color:#6A8F67;margin:0;">
            © 2025 MonarkAsset Private Wealth Management · SEBI Registered
          </p>
        </div>
      </div>
    `,
  };

  try {
    await Promise.all([
      transporter.sendMail(advisorMail),
      transporter.sendMail(autoReply),
    ]);
    console.log(`📧  Enquiry from ${firstName} ${lastName} <${email}>`);
    res.json({ success: true });
  } catch (err) {
    console.error('❌  Mail error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to send email. Please try again.' });
  }
});

// ── Health check ─────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', server: 'email' }));

// ── Keep alive ──────────────────────────────────────────────
const https = require('https');

setInterval(() => {
  const url = process.env.RAILWAY_STATIC_URL || `http://localhost:${PORT}/health`;
  https.get(url, (res) => {
    console.log(`🔄 Keep-alive ping: ${res.statusCode}`);
  }).on('error', (err) => {
    console.warn('Keep-alive ping failed:', err.message);
  });
}, 5 * 60 * 1000); // every 5 minutes

// ── Start ────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n📬  Email server running at http://localhost:${PORT}`);
  console.log(`    API → http://localhost:${PORT}/api/contact\n`);
});
