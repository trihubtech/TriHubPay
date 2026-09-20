import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config';

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!transporter) {
    if (config.smtp.user && config.smtp.pass) {
      transporter = nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.secure,
        auth: {
          user: config.smtp.user,
          pass: config.smtp.pass
        }
      });
    }
  }
  return transporter;
}

export async function sendPasswordResetOtpEmail(
  toEmail: string,
  recipientName: string,
  otp: string
): Promise<{ success: boolean; delivered: boolean; info?: string }> {
  console.log(`\n======================================================`);
  console.log(`🔐 [FREE EMAIL OTP ENGINE] Password Reset Requested`);
  console.log(`👤 Recipient: ${recipientName} (${toEmail})`);
  console.log(`🔑 Verification Code (OTP): [ ${otp} ]`);
  console.log(`⏳ Valid For: 10 minutes`);
  console.log(`======================================================\n`);

  const mailTransporter = getTransporter();

  // If no SMTP password configured, development/console fallback is successful
  if (!mailTransporter || !config.smtp.pass) {
    console.log(`ℹ️ [FREE EMAIL OTP] SMTP credentials not provided. OTP logged above for verification.`);
    return {
      success: true,
      delivered: false,
      info: 'OTP generated and logged to backend console (local development mode).'
    };
  }

  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TriHubPay Password Reset Code</title>
  </head>
  <body style="margin:0;padding:0;background-color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#334155;">
    <div style="max-width:560px;margin:30px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 25px rgba(0,0,0,0.2);">
      
      <!-- Brand Header -->
      <div style="background:linear-gradient(135deg, #1e3a8a 0%, #0284c7 50%, #059669 100%);padding:32px 24px;text-align:center;">
        <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:900;letter-spacing:-0.5px;">
          TriHub<span style="color:#6ee7b7;">Pay</span>
        </h1>
        <p style="margin:6px 0 0;color:#e0f2fe;font-size:13px;font-weight:500;">
          Next-Gen B2B Recharge & Bill Payments Platform
        </p>
      </div>

      <!-- Main Body -->
      <div style="padding:32px 28px;">
        <h2 style="margin:0 0 12px;color:#0f172a;font-size:18px;font-weight:700;">
          Password Reset Request
        </h2>
        <p style="margin:0 0 20px;color:#475569;font-size:14px;line-height:1.6;">
          Hello <strong>${recipientName || 'Valued Retailer'}</strong>,
        </p>
        <p style="margin:0 0 24px;color:#475569;font-size:14px;line-height:1.6;">
          We received a request to reset the password for your <strong>TriHubPay</strong> retailer account. Use the 6-digit verification code below to complete your reset:
        </p>

        <!-- OTP Highlight Card -->
        <div style="background:#f0fdf4;border:2px dashed #10b981;border-radius:12px;padding:20px;text-align:center;margin:24px 0;">
          <span style="display:block;font-size:11px;font-weight:700;color:#047857;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:6px;">Your 6-Digit One-Time Code</span>
          <span style="display:inline-block;font-size:36px;font-weight:900;color:#065f46;letter-spacing:8px;font-family:Consolas,Monaco,'Courier New',monospace;">
            ${otp}
          </span>
          <span style="display:block;font-size:12px;color:#059669;margin-top:6px;">
            ⏱ Valid for <strong>10 minutes</strong> only
          </span>
        </div>

        <!-- Security Warning -->
        <div style="background:#fffbeb;border-left:4px solid #f59e0b;padding:12px 16px;border-radius:6px;margin:24px 0;">
          <p style="margin:0;color:#92400e;font-size:12px;line-height:1.5;">
            <strong>⚠️ Security Notice:</strong> Never share this OTP with anyone, including anyone claiming to be from TriHubPay. TriHubPay staff will never ask for your password or OTP.
          </p>
        </div>

        <p style="margin:0 0 8px;color:#64748b;font-size:13px;line-height:1.5;">
          If you did not request this password reset, please ignore this email or reach out immediately to our 24/7 priority support helpline.
        </p>
      </div>

      <!-- Support Footer -->
      <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 28px;text-align:center;">
        <p style="margin:0 0 6px;font-size:12px;color:#64748b;">
          Need assistance? We're always here to help.
        </p>
        <p style="margin:0;font-size:12px;color:#334155;font-weight:600;">
          📞 Helpline: <a href="tel:+916374569225" style="color:#0284c7;text-decoration:none;">+91 63745 69225</a> &nbsp;|&nbsp; 
          ✉️ Email: <a href="mailto:trihubtechnologies@gmail.com" style="color:#0284c7;text-decoration:none;">trihubtechnologies@gmail.com</a>
        </p>
        <p style="margin:12px 0 0;font-size:11px;color:#94a3b8;">
          © 2026 TriHub Technologies. All rights reserved. • TriHubPay Platform
        </p>
      </div>

    </div>
  </body>
  </html>
  `;

  try {
    const info = await mailTransporter.sendMail({
      from: config.smtp.from,
      to: toEmail,
      subject: `[TriHubPay] Your Password Reset OTP: ${otp}`,
      text: `Hello ${recipientName},\n\nYour TriHubPay password reset verification code is: ${otp}\n\nThis code expires in 10 minutes. Do not share it with anyone.\n\nSupport: +91 63745 69225 | trihubtechnologies@gmail.com`,
      html: htmlContent
    });

    console.log(`✅ [FREE EMAIL OTP] Email successfully dispatched to ${toEmail}. Message ID: ${info.messageId}`);
    return { success: true, delivered: true, info: info.messageId };
  } catch (error: any) {
    console.error(`⚠️ [FREE EMAIL OTP] Failed to send email via SMTP:`, error.message);
    // Return success true because the OTP was generated and is valid in system/console fallback
    return {
      success: true,
      delivered: false,
      info: `SMTP delivery notice: ${error.message}`
    };
  }
}
