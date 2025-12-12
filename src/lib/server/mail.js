import postmark from 'postmark';

const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = !isProduction;

// Postmark client
const client = new postmark.ServerClient(process.env.POSTMARK_SERVER_TOKEN);

// Common template model values
const getCommonTemplateModel = () => ({
  product_name: 'AI Rank',
  product_url: process.env.NEXTAUTH_URL || 'https://airank.com',
  company_name: 'AI Rank',
  company_address: '',
  current_year: new Date().getFullYear().toString(),
  support_email: 'support@airank.com',
  help_url: 'https://docs.airank.com',
});

/**
 * Send Magic Link email for authentication
 */
export const sendMagicLinkEmail = async ({ to, name, actionUrl, operatingSystem = 'Unknown', browserName = 'Unknown' }) => {
  const templateModel = {
    ...getCommonTemplateModel(),
    name: name || to.split('@')[0],
    action_url: actionUrl,
    operating_system: operatingSystem,
    browser_name: browserName,
  };

  if (isDevelopment) {
    console.log('\n========== MAGIC LINK EMAIL (DEV) ==========');
    console.log('To:', to);
    console.log('Template: airank-magic-link');
    console.log('Action URL:', actionUrl);
    console.log('Template Model:', JSON.stringify(templateModel, null, 2));
    console.log('=============================================\n');
    return { success: true, dev: true };
  }

  try {
    const result = await client.sendEmailWithTemplate({
      From: process.env.EMAIL_FROM || 'noreply@airank.com',
      To: to,
      TemplateAlias: 'airank-magic-link',
      TemplateModel: templateModel,
    });
    console.log('Magic link email sent to:', to);
    return { success: true, messageId: result.MessageID };
  } catch (error) {
    console.error('Failed to send magic link email:', error);
    throw error;
  }
};

/**
 * Send Welcome email for new users (first login)
 */
export const sendWelcomeEmail = async ({ to, name, email }) => {
  const templateModel = {
    ...getCommonTemplateModel(),
    name: name || email.split('@')[0],
    email: email,
    action_url: `${process.env.NEXTAUTH_URL}/account`,
    login_url: `${process.env.NEXTAUTH_URL}/auth/login`,
    help_url: 'https://docs.airank.com',
  };

  if (isDevelopment) {
    console.log('\n========== WELCOME EMAIL (DEV) ==========');
    console.log('To:', to);
    console.log('Template: airank-welcome');
    console.log('Action URL:', templateModel.action_url);
    console.log('Login URL:', templateModel.login_url);
    console.log('Template Model:', JSON.stringify(templateModel, null, 2));
    console.log('==========================================\n');
    return { success: true, dev: true };
  }

  try {
    const result = await client.sendEmailWithTemplate({
      From: process.env.EMAIL_FROM || 'noreply@airank.com',
      To: to,
      TemplateAlias: 'airank-welcome',
      TemplateModel: templateModel,
    });
    console.log('Welcome email sent to:', to);
    return { success: true, messageId: result.MessageID };
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    throw error;
  }
};

/**
 * Send Workspace Invitation email
 */
export const sendWorkspaceInvitationEmail = async ({ to, name, inviterName, workspaceName }) => {
  const templateModel = {
    ...getCommonTemplateModel(),
    name: name || to.split('@')[0],
    inviter_name: inviterName,
    workspace_name: workspaceName,
    action_url: `${process.env.NEXTAUTH_URL}/account`,
  };

  if (isDevelopment) {
    console.log('\n========== WORKSPACE INVITATION EMAIL (DEV) ==========');
    console.log('To:', to);
    console.log('Template: airank-workspace-invitation');
    console.log('Inviter:', inviterName);
    console.log('Workspace:', workspaceName);
    console.log('Action URL:', templateModel.action_url);
    console.log('Template Model:', JSON.stringify(templateModel, null, 2));
    console.log('=======================================================\n');
    return { success: true, dev: true };
  }

  try {
    const result = await client.sendEmailWithTemplate({
      From: process.env.EMAIL_FROM || 'noreply@airank.com',
      To: to,
      TemplateAlias: 'airank-workspace-invitation',
      TemplateModel: templateModel,
    });
    console.log('Workspace invitation email sent to:', to);
    return { success: true, messageId: result.MessageID };
  } catch (error) {
    console.error('Failed to send workspace invitation email:', error);
    throw error;
  }
};

// Legacy exports for backward compatibility with nodemailer-based code
export const emailConfig = {
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
  service: process.env.EMAIL_SERVICE,
};

// Legacy sendMail function (deprecated - use specific functions above)
export const sendMail = async ({ from, html, subject, text, to }) => {
  console.warn('sendMail is deprecated. Use sendMagicLinkEmail, sendWelcomeEmail, or sendWorkspaceInvitationEmail instead.');

  if (isDevelopment) {
    console.log('\n========== LEGACY EMAIL (DEV) ==========');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('Text:', text);
    console.log('=========================================\n');
    return;
  }

  try {
    await client.sendEmail({
      From: from ?? process.env.EMAIL_FROM,
      To: to,
      Subject: subject,
      TextBody: text,
      HtmlBody: html,
    });
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
};

export default client;
