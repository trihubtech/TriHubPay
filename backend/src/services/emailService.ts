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

export async function sendLoginAlertEmail(
  toEmail: string,
  recipientName: string,
  meta: { ip: string; userAgent: string; time: string; location?: string }
): Promise<{ success: boolean; delivered: boolean; info?: string }> {
  console.log(`\n======================================================`);
  console.log(`🔔 [LOGIN SECURITY ALERT] New Session Login`);
  console.log(`👤 User: ${recipientName} (${toEmail})`);
  console.log(`🌐 IP Address: ${meta.ip}`);
  console.log(`📱 Device / Client: ${meta.userAgent}`);
  console.log(`⏰ Time: ${meta.time}`);
  console.log(`======================================================\n`);

  if (!toEmail || !toEmail.includes('@')) {
    return { success: false, delivered: false, info: 'No valid email address' };
  }

  const mailTransporter = getTransporter();
  if (!mailTransporter || !config.smtp.pass) {
    return {
      success: true,
      delivered: false,
      info: 'SMTP not configured; login alert logged to console.'
    };
  }

  // Parse simple device name from userAgent
  let deviceName = 'Web Browser';
  const ua = meta.userAgent || '';
  if (/android/i.test(ua)) deviceName = 'Android Mobile / Tablet';
  else if (/iphone|ipad|ipod/i.test(ua)) deviceName = 'Apple iOS Device';
  else if (/windows/i.test(ua)) deviceName = 'Windows PC';
  else if (/macintosh|mac os/i.test(ua)) deviceName = 'Apple Mac';
  else if (/linux/i.test(ua)) deviceName = 'Linux Device';

  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Security Alert: New Login to TriHubPay</title>
  </head>
  <body style="margin:0;padding:0;background-color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#334155;">
    <div style="max-width:560px;margin:30px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 25px rgba(0,0,0,0.2);">
      
      <!-- Brand Header -->
      <div style="background:linear-gradient(135deg, #1e3a8a 0%, #0284c7 50%, #059669 100%);padding:28px 24px;text-align:center;">
        <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:900;letter-spacing:-0.5px;">
          TriHub<span style="color:#6ee7b7;">Pay</span>
        </h1>
        <p style="margin:4px 0 0;color:#e0f2fe;font-size:12px;font-weight:500;">
          Account Security Notification
        </p>
      </div>

      <!-- Main Body -->
      <div style="padding:28px 24px;">
        <h2 style="margin:0 0 10px;color:#0f172a;font-size:17px;font-weight:700;">
          New Login Detected
        </h2>
        <p style="margin:0 0 16px;color:#475569;font-size:13px;line-height:1.6;">
          Hello <strong>${recipientName || 'Valued User'}</strong>,
        </p>
        <p style="margin:0 0 20px;color:#475569;font-size:13px;line-height:1.6;">
          A new sign-in was just detected on your TriHubPay account. Here are the security details for this session:
        </p>

        <!-- Log Details Box -->
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin:16px 0;">
          <table style="width:100%;border-collapse:collapse;font-size:12px;line-height:1.8;">
            <tr>
              <td style="color:#64748b;font-weight:600;width:120px;">📱 Device:</td>
              <td style="color:#0f172a;font-weight:700;">${deviceName}</td>
            </tr>
            <tr>
              <td style="color:#64748b;font-weight:600;">🌐 IP Address:</td>
              <td style="color:#0f172a;font-family:monospace;font-weight:700;">${meta.ip}</td>
            </tr>
            <tr>
              <td style="color:#64748b;font-weight:600;">⏰ Time:</td>
              <td style="color:#0f172a;">${meta.time}</td>
            </tr>
            <tr>
              <td style="color:#64748b;font-weight:600;">📍 Location:</td>
              <td style="color:#0f172a;">${meta.location || 'India (Network Detected)'}</td>
            </tr>
          </table>
        </div>

        <!-- Security Warning -->
        <div style="background:#f0fdf4;border-left:4px solid #10b981;padding:12px 14px;border-radius:6px;margin:20px 0;">
          <p style="margin:0;color:#065f46;font-size:12px;line-height:1.5;">
            <strong>✅ Was this you?</strong> If you recently logged in, you can safely disregard this alert. No further action is required.
          </p>
        </div>

        <div style="background:#fff1f2;border-left:4px solid #f43f5e;padding:12px 14px;border-radius:6px;margin:16px 0;">
          <p style="margin:0;color:#9f1239;font-size:12px;line-height:1.5;">
            <strong>⚠️ Don't recognize this activity?</strong> Please log into your TriHubPay account immediately and change your password in the Security settings, or contact priority support.
          </p>
        </div>
      </div>

      <!-- Support Footer -->
      <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 24px;text-align:center;">
        <p style="margin:0;font-size:11px;color:#64748b;">
          TriHubPay Support: +91 63745 69225 • trihubtechnologies@gmail.com
        </p>
        <p style="margin:6px 0 0;font-size:10px;color:#94a3b8;">
          © 2026 TriHub Technologies. All rights reserved.
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
      subject: `[TriHubPay Security] New Login Detected - ${deviceName}`,
      text: `Hello ${recipientName},\n\nA new login was detected on your TriHubPay account.\nDevice: ${deviceName}\nIP: ${meta.ip}\nTime: ${meta.time}\n\nIf this wasn't you, please change your password immediately in Settings.\n\nSupport: +91 63745 69225`,
      html: htmlContent
    });
    return { success: true, delivered: true, info: info.messageId };
  } catch (error: any) {
    console.error(`⚠️ [LOGIN SECURITY ALERT] Failed to dispatch login alert email:`, error.message);
    return { success: false, delivered: false, info: error.message };
  }
}

