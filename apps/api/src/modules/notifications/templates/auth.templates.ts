import type { MessageTemplate, TemplateMap } from '../message-template.service';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface AuthNotificationContext {
  userName: string;
  code?: string;
  resetLink?: string;
  loginTime?: string;
  ipAddress?: string;
  eventName: string;
}

/** @deprecated Use the shared `MessageTemplate` from message-template.service. */
export type AuthTemplate = MessageTemplate;

/** @deprecated Use the shared `TemplateMap` from message-template.service. */
export type AuthMessageTemplates = TemplateMap;

/* ------------------------------------------------------------------ */
/*  Default templates (used as fallback when DB has no value)          */
/* ------------------------------------------------------------------ */

export const DEFAULT_AUTH_TEMPLATES: TemplateMap = {
  registration_welcome: {
    title: 'Welcome to NEXA',
    emailBody:
      'Hi {{userName}}, welcome to NEXA! We are thrilled to have you on board.',
    smsBody:
      'NEXA: Hi {{userName}}, welcome to NEXA! We are thrilled to have you on board.',
  },
  otp_code: {
    title: 'Your Verification Code',
    emailBody:
      'Hi {{userName}}, your NEXA verification code is <strong style="font-size: 20px;">{{code}}</strong>. It will expire in 10 minutes.',
    smsBody:
      'NEXA: Your verification code is {{code}}. Valid for 10 minutes. Do not share this code.',
  },
  password_reset: {
    title: 'Password Reset Request',
    emailBody:
      'Hi {{userName}}, click the link below to reset your NEXA password:<br/><br/><a href="{{resetLink}}">Reset Password</a><br/><br/>If you did not request this, please ignore this email.',
    smsBody:
      'NEXA: Reset your password here: {{resetLink}}',
  },
  password_changed: {
    title: 'Password Changed Successfully',
    emailBody:
      'Hi {{userName}}, your NEXA password was successfully changed. If you did not request this, please contact support immediately.',
    smsBody:
      'NEXA: Your password was just changed. If this wasn\'t you, please contact support.',
  },
  login_alert: {
    title: 'New Login to Your Account',
    emailBody:
      'Hi {{userName}}, we detected a new login to your NEXA account on {{loginTime}} from {{ipAddress}}.',
    smsBody:
      'NEXA: A new login was detected on your account at {{loginTime}}.',
  },
};

/** The settings key used to persist custom templates in system_settings */
export const AUTH_NOTIFICATION_TEMPLATES_KEY = 'auth_notification_templates';

/** Generic fallback when the auth event is not in the defaults map. */
export const AUTH_GENERIC_FALLBACK: MessageTemplate = {
  title: 'Account Update',
  emailBody: 'Your account has a new update.',
  smsBody: 'NEXA: Your account has a new update.',
};
