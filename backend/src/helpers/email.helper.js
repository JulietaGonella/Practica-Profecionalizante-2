import nodemailer from 'nodemailer';

let transporter = null;

// Inicializa el transportador de correo
const getTransporter = async () => {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST) {
    // Si en el futuro agregas un servidor real o Mailtrap
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // 🧪 Servidor de prueba automático (Ethereal Email)
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log('🧪 [EMAIL TEST] Cuenta de pruebas Ethereal creada:', testAccount.user);
  }

  return transporter;
};

export const enviarEmailRecuperacion = async (toEmail, resetUrl) => {
  const mailer = await getTransporter();

  const info = await mailer.sendMail({
    from: '"SmartDrop Soporte" <no-reply@smartdrop.com>',
    to: toEmail,
    subject: 'Restablecer contraseña - SmartDrop',
    html: `
      <h2>Recuperación de Contraseña</h2>
      <p>Has solicitado restablecer tu contraseña. Haz clic en el siguiente enlace para continuar:</p>
      <a href="${resetUrl}" target="_blank" style="background-color: #4CAF50; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px; display: inline-block;">Restablecer Contraseña</a>
      <p>Este enlace expira en 15 minutos.</p>
      <p>Si no solicitaste este cambio, puedes ignorar este mensaje.</p>
    `,
  });

  console.log(`\n📧 [EMAIL ENVIADO] ID del mensaje: ${info.messageId}`);
  
  // Si estamos usando Ethereal, nos dará una URL pública para ver el email renderizado
  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log(`🔗 [VER EMAIL EN NAVEGADOR]: ${previewUrl}\n`);
  }

  return previewUrl;
};