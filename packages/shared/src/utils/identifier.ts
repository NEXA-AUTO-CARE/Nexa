export type UserIdentifierKind = 'email' | 'phone';

export interface IdentifierParts {
  kind: UserIdentifierKind;
  email: string | null;
  phoneNumber: string | null;
}

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_REGEX = /^\+?[1-9]\d{6,14}$/;
export const FLEXIBLE_PHONE_REGEX = /^\+?[0-9\s\-()]{7,20}$/;

/**
 * Strips any character not valid in a phone number input (letters, arbitrary symbols),
 * keeping only digits, spaces, hyphens, parentheses, and a leading '+'.
 */
export function sanitizePhoneInput(value: string): string {
  const hasLeadingPlus = value.trimStart().startsWith('+');
  const cleaned = value.replace(/[^0-9\s\-()]/g, '');
  return hasLeadingPlus ? `+${cleaned}` : cleaned;
}

/**
 * Checks whether a phone string contains a valid 7-to-15 digit phone number
 * (supporting UK domestic 07.../01... and international +44... formats).
 */
export function isValidPhoneNumber(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || !FLEXIBLE_PHONE_REGEX.test(trimmed)) return false;
  const digitsOnly = trimmed.replace(/\D/g, '');
  return digitsOnly.length >= 7 && digitsOnly.length <= 15;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizePhone(phone: string): string {
  return phone.replace(/\s/g, '');
}

export function normalizeIdentifier(identifier: string): string {
  const trimmed = identifier.trim();
  if (trimmed.includes('@')) {
    return normalizeEmail(trimmed);
  }
  return normalizePhone(trimmed);
}

export function parseIdentifier(identifier: string): IdentifierParts {
  const trimmed = identifier.trim();
  if (EMAIL_REGEX.test(trimmed)) {
    return { kind: 'email', email: trimmed.toLowerCase(), phoneNumber: null };
  }
  const phoneCandidate = trimmed.replace(/\s/g, '');
  if (PHONE_REGEX.test(phoneCandidate)) {
    return { kind: 'phone', email: null, phoneNumber: phoneCandidate };
  }
  throw new Error(
    'Identifier must be a valid email or E.164-style phone number',
  );
}
