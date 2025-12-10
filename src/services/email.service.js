const nodemailer = require('nodemailer');

/**
 * Kiểm tra email configuration có đầy đủ không
 */
function validateEmailConfig() {
  const emailService = process.env.EMAIL_SERVICE || 'gmail';
  const emailUser = process.env.EMAIL_USER;
  const emailPassword = process.env.EMAIL_PASSWORD;

  if (!emailUser || !emailPassword) {
    throw new Error(
      'Email configuration is missing. Please set EMAIL_USER and EMAIL_PASSWORD in your .env file.\n' +
      'For Gmail: Use App Password (not regular password).\n' +
      'See README.md for setup instructions.'
    );
  }

  // Nếu dùng SMTP tùy chỉnh, cần thêm host
  if (emailService === 'smtp') {
    const emailHost = process.env.EMAIL_HOST;
    if (!emailHost) {
      throw new Error('EMAIL_HOST is required when EMAIL_SERVICE=smtp');
    }
  }

  return true;
}

/**
 * Tạo transporter cho nodemailer
 * Hỗ trợ Gmail, Outlook và SMTP tùy chỉnh
 */
function createTransporter() {
  // Validate config trước
  validateEmailConfig();

  const emailService = process.env.EMAIL_SERVICE || 'gmail';
  const emailUser = process.env.EMAIL_USER;
  const emailPassword = process.env.EMAIL_PASSWORD;
  const emailHost = process.env.EMAIL_HOST;
  const emailPort = process.env.EMAIL_PORT || 587;

  // Nếu dùng Gmail hoặc Outlook
  if (emailService === 'gmail' || emailService === 'outlook') {
    return nodemailer.createTransport({
      service: emailService,
      auth: {
        user: emailUser,
        pass: emailPassword
      }
    });
  }

  // Nếu dùng SMTP tùy chỉnh
  return nodemailer.createTransport({
    host: emailHost,
    port: parseInt(emailPort),
    secure: emailPort === '465', // true for 465, false for other ports
    auth: {
      user: emailUser,
      pass: emailPassword
    }
  });
}

/**
 * Gửi email OTP để xác thực email
 * @param {string} email - Email người nhận
 * @param {string} code - Mã OTP (6 chữ số)
 * @param {string} name - Tên người dùng
 */
async function sendOTPEmail(email, code, name = 'User') {
  try {
    // Validate email config trước khi tạo transporter
    validateEmailConfig();
    
    const transporter = createTransporter();
    const appName = process.env.APP_NAME || 'MiniSocial';

    const mailOptions = {
      from: `"${appName}" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Xác thực email - ${appName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background-color: #f9f9f9;
              border-radius: 10px;
              padding: 30px;
              border: 1px solid #e0e0e0;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo {
              font-size: 24px;
              font-weight: bold;
              color: #4a90e2;
            }
            .code-container {
              background-color: #ffffff;
              border: 2px dashed #4a90e2;
              border-radius: 8px;
              padding: 20px;
              text-align: center;
              margin: 30px 0;
            }
            .code {
              font-size: 32px;
              font-weight: bold;
              letter-spacing: 8px;
              color: #4a90e2;
              font-family: 'Courier New', monospace;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e0e0e0;
              font-size: 12px;
              color: #666;
              text-align: center;
            }
            .warning {
              background-color: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 15px;
              margin: 20px 0;
              border-radius: 4px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">${appName}</div>
            </div>
            
            <h2>Xin chào ${name}!</h2>
            
            <p>Cảm ơn bạn đã đăng ký tài khoản tại ${appName}. Để hoàn tất đăng ký, vui lòng sử dụng mã OTP bên dưới để xác thực email của bạn.</p>
            
            <div class="code-container">
              <div class="code">${code}</div>
            </div>
            
            <div class="warning">
              <strong>⚠️ Lưu ý:</strong>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>Mã OTP này có hiệu lực trong <strong>10 phút</strong></li>
                <li>Không chia sẻ mã này với bất kỳ ai</li>
                <li>Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này</li>
              </ul>
            </div>
            
            <p>Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.</p>
            
            <div class="footer">
              <p>Email này được gửi tự động, vui lòng không trả lời.</p>
              <p>&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Xin chào ${name}!
        
        Cảm ơn bạn đã đăng ký tài khoản tại ${appName}. 
        
        Mã OTP của bạn là: ${code}
        
        Mã này có hiệu lực trong 10 phút.
        
        Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending email:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

/**
 * Gửi email thông báo xác thực thành công
 */
async function sendVerificationSuccessEmail(email, name = 'User') {
  try {
    // Validate email config trước khi tạo transporter
    validateEmailConfig();
    
    const transporter = createTransporter();
    const appName = process.env.APP_NAME || 'MiniSocial';

    const mailOptions = {
      from: `"${appName}" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Email đã được xác thực - ${appName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background-color: #f9f9f9;
              border-radius: 10px;
              padding: 30px;
              border: 1px solid #e0e0e0;
            }
            .success {
              background-color: #d4edda;
              border-left: 4px solid #28a745;
              padding: 15px;
              margin: 20px 0;
              border-radius: 4px;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Xin chào ${name}!</h2>
            
            <div class="success">
              <h3>✅ Email của bạn đã được xác thực thành công!</h3>
            </div>
            
            <p>Tài khoản của bạn đã được kích hoạt và bạn có thể sử dụng đầy đủ các tính năng của ${appName}.</p>
            
            <p>Chúc bạn có trải nghiệm tuyệt vời!</p>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('❌ Error sending verification success email:', error);
    // Không throw error vì đây chỉ là email thông báo
    return { success: false };
  }
}

module.exports = {
  sendOTPEmail,
  sendVerificationSuccessEmail
};

