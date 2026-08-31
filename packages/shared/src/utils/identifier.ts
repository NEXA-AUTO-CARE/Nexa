export type UserIdentifierKind = 'email' | 'phone';

export interface IdentifierParts {
  kind: UserIdentifierKind;
  email: string | null;
  phoneNumber: string | null;
}

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_REGEX = /^\+?[1-9]\d{6,14}$/;

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
