import { parseIdentifier } from './users.service';

describe('parseIdentifier', () => {
  it('classifies a typical email and lowercases it', () => {
    expect(parseIdentifier('Alice@Example.com')).toEqual({
      kind: 'email',
      email: 'alice@example.com',
      phoneNumber: null,
    });
  });

  it('strips whitespace from email input', () => {
    expect(parseIdentifier('  bob@nexa.test  ')).toEqual({
      kind: 'email',
      email: 'bob@nexa.test',
      phoneNumber: null,
    });
  });

  it('classifies an E.164 phone number', () => {
    expect(parseIdentifier('+447700900123')).toEqual({
      kind: 'phone',
      email: null,
      phoneNumber: '+447700900123',
    });
  });

  it('strips internal whitespace from phone numbers', () => {
    expect(parseIdentifier('+44 7700 900 123')).toEqual({
      kind: 'phone',
      email: null,
      phoneNumber: '+447700900123',
    });
  });

  it('accepts phone without leading +', () => {
    expect(parseIdentifier('447700900123')).toEqual({
      kind: 'phone',
      email: null,
      phoneNumber: '447700900123',
    });
  });

  it('throws on garbage input', () => {
    expect(() => parseIdentifier('not-an-id')).toThrow(/valid email or E.164/i);
  });

  it('throws on empty input', () => {
    expect(() => parseIdentifier('   ')).toThrow();
  });
});

describe('sanitizePhoneInput and isValidPhoneNumber (BUG-34)', () => {
  const {
    sanitizePhoneInput,
    isValidPhoneNumber,
  } = require('@nexa/shared');

  it('strips alphabetic and special characters while preserving valid phone characters', () => {
    expect(sanitizePhoneInput('+44 (0) 7700-900123 abc!@#')).toBe(
      '+44 (0) 7700-900123 ',
    );
    expect(sanitizePhoneInput('hello+44+123')).toBe('44123');
  });

  it('validates real UK/international phone numbers and rejects letters or short strings', () => {
    expect(isValidPhoneNumber('+44 7700 900123')).toBe(true);
    expect(isValidPhoneNumber('01224 123456')).toBe(true);
    expect(isValidPhoneNumber('+44 (0) 1224-555-666')).toBe(true);
    expect(isValidPhoneNumber('abcdefg')).toBe(false);
    expect(isValidPhoneNumber('12345')).toBe(false);
    expect(isValidPhoneNumber('+44 7700 abcdef')).toBe(false);
  });
});
