import { describe, expect, it } from 'vitest';
import { capital, isUnnamed, possessive, UNNAMED } from '../lib/model/name';

describe('the name before one is added', () => {
  it('reads as "their" until the carer adds a name', () => {
    expect(isUnnamed(UNNAMED)).toBe(true);
    expect(possessive(UNNAMED)).toBe('their');
    expect(capital(possessive(UNNAMED))).toBe('Their');
  });
  it('uses the name once there is one', () => {
    expect(isUnnamed('Mum')).toBe(false);
    expect(possessive('Mum')).toBe("Mum's");
    expect(possessive('Mum', '’')).toBe('Mum’s');
  });
});
