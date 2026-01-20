const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    // Configuration du transporteur email
    // Pour le développement, on peut utiliser un service comme Gmail ou un service SMTP
    // Pour la production, utilisez un service comme SendGrid, Mailgun, etc.
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    // Configuration pour Gmail (exemple)
    // Pour utiliser Gmail, vous devez créer un "App Password" dans votre compte Google
    // Ou utiliser un service SMTP personnalisé
    const emailConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // true pour 465, false pour autres ports
      auth: {
        user: process.env.SMTP_USER || process.env.EMAIL_USER,
        pass: process.env.SMTP_PASS || process.env.EMAIL_PASSWORD,
      },
    };

    // Si les credentials ne sont pas configurés, utiliser un transporteur de test
    if (!emailConfig.auth.user || !emailConfig.auth.pass) {
      console.warn('⚠️  SMTP non configuré. Utilisation du mode test (emails ne seront pas envoyés).');
      console.warn('   Configurez SMTP_USER et SMTP_PASS dans votre .env pour envoyer de vrais emails.');
      
      // Mode test - les emails seront loggés mais pas envoyés
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        auth: {
          user: 'test@example.com',
          pass: 'test',
        },
      });
    } else {
      this.transporter = nodemailer.createTransport(emailConfig);
    }
  }

  async sendVerificationCode(email, code) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@localisation-cotonou.com',
        to: email,
        subject: 'Code de vérification - Géolocalisation Cotonou',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
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
                border: 1px solid #ddd;
              }
              .header {
                text-align: center;
                margin-bottom: 30px;
              }
              .logo {
                font-size: 24px;
                font-weight: bold;
                color: #1976d2;
                margin-bottom: 10px;
              }
              .code-box {
                background-color: #fff;
                border: 2px dashed #1976d2;
                border-radius: 8px;
                padding: 20px;
                text-align: center;
                margin: 30px 0;
              }
              .code {
                font-size: 32px;
                font-weight: bold;
                letter-spacing: 8px;
                color: #1976d2;
                font-family: 'Courier New', monospace;
              }
              .footer {
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #ddd;
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
                <div class="logo">📍 Géolocalisation Cotonou</div>
                <h2>Vérification de votre email</h2>
              </div>
              
              <p>Bonjour,</p>
              
              <p>Vous avez demandé à créer un compte sur l'application de géolocalisation des infrastructures publiques de Cotonou.</p>
              
              <p>Utilisez le code suivant pour vérifier votre adresse email :</p>
              
              <div class="code-box">
                <div class="code">${code}</div>
              </div>
              
              <div class="warning">
                <strong>⚠️ Important :</strong> Ce code est valide pendant 10 minutes. Ne partagez jamais ce code avec quelqu'un d'autre.
              </div>
              
              <p>Si vous n'avez pas demandé ce code, vous pouvez ignorer cet email en toute sécurité.</p>
              
              <div class="footer">
                <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
                <p>&copy; ${new Date().getFullYear()} Géolocalisation Cotonou - Tous droits réservés</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `
          Code de vérification - Géolocalisation Cotonou
          
          Bonjour,
          
          Vous avez demandé à créer un compte. Utilisez le code suivant pour vérifier votre adresse email :
          
          ${code}
          
          Ce code est valide pendant 10 minutes.
          
          Si vous n'avez pas demandé ce code, vous pouvez ignorer cet email.
        `,
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      console.log('✅ Email de vérification envoyé à:', email);
      console.log('   Message ID:', info.messageId);
      
      return info;
    } catch (error) {
      console.error('❌ Erreur lors de l\'envoi de l\'email:', error);
      
      // Si c'est une erreur d'authentification Gmail, donner des instructions
      if (error.code === 'EAUTH') {
        const authError = new Error('Erreur d\'authentification Gmail. Assurez-vous d\'utiliser un "Mot de passe d\'application" (App Password) et non votre mot de passe Gmail normal. Activez l\'authentification à deux facteurs dans votre compte Google et créez un mot de passe d\'application.');
        authError.code = 'EAUTH';
        throw authError;
      }
      
      throw error;
    }
  }

  async sendWelcomeEmail(email, nom, role) {
    try {
      const roleLabels = {
        'administrateur': 'Administrateur',
        'agent communal': 'Agent Communal',
        'super_admin': 'Super Administrateur',
        'admin': 'Administrateur',
        'agent_communal': 'Agent Communal',
      };

      const roleLabel = roleLabels[role] || role;

      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@localisation-cotonou.com',
        to: email,
        subject: 'Bienvenue - Géolocalisation Cotonou',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
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
                border: 1px solid #ddd;
              }
              .header {
                text-align: center;
                margin-bottom: 30px;
              }
              .logo {
                font-size: 24px;
                font-weight: bold;
                color: #1976d2;
                margin-bottom: 10px;
              }
              .footer {
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #ddd;
                font-size: 12px;
                color: #666;
                text-align: center;
              }
              .button {
                display: inline-block;
                padding: 12px 24px;
                background-color: #1976d2;
                color: white;
                text-decoration: none;
                border-radius: 5px;
                margin: 20px 0;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">📍 Géolocalisation Cotonou</div>
                <h2>Bienvenue dans l'équipe !</h2>
              </div>
              
              <p>Bonjour ${nom},</p>
              
              <p>Votre compte <strong>${roleLabel}</strong> a été créé avec succès sur la plateforme de géolocalisation des infrastructures publiques de Cotonou.</p>
              
              <p>Vous pouvez maintenant accéder au tableau de bord administrateur pour commencer à gérer les infrastructures de votre zone.</p>
              
              <div style="text-align: center;">
                <a href="${process.env.DASHBOARD_URL || 'http://localhost:3000'}/login" class="button">
                  Accéder au Tableau de Bord
                </a>
              </div>
              
              <p>Si vous avez des questions ou besoin d'aide, n'hésitez pas à contacter le support.</p>
              
              <div class="footer">
                <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
                <p>&copy; ${new Date().getFullYear()} Géolocalisation Cotonou - Tous droits réservés</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `
          Bienvenue - Géolocalisation Cotonou
          
          Bonjour ${nom},
          
          Votre compte ${roleLabel} a été créé avec succès sur la plateforme de géolocalisation des infrastructures publiques de Cotonou.
          
          Vous pouvez maintenant accéder au tableau de bord administrateur pour commencer à gérer les infrastructures de votre zone.
          
          URL du tableau de bord: ${process.env.DASHBOARD_URL || 'http://localhost:3000'}/login
          
          Si vous avez des questions ou besoin d'aide, n'hésitez pas à contacter le support.
        `,
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      console.log('✅ Email de bienvenue envoyé à:', email);
      console.log('   Message ID:', info.messageId);
      
      return info;
    } catch (error) {
      console.error('❌ Erreur lors de l\'envoi de l\'email de bienvenue:', error);
      throw error;
    }
  }
}

module.exports = new EmailService();

