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
