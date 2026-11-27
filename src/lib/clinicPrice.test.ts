import { describe, expect, it } from 'vitest';
import { clinicFromPrice, formatPriceFrom } from './clinicPrice';

describe('clinicFromPrice', () => {
  it('returns undefined when there are no valid prices', () => {
    expect(clinicFromPrice([])).toBeUndefined();
    expect(clinicFromPrice([{ priceFrom: Number.NaN }, { priceFrom: -1 }])).toBeUndefined();
  });

  it('returns the minimum valid price including zero', () => {
    expect(clinicFromPrice([{ priceFrom: 500 }, { priceFrom: 300 }])).toBe(300);
    expect(clinicFromPrice([{ priceFrom: 0 }])).toBe(0);
  });
});

describe('formatPriceFrom', () => {
  it('formats whole pesos without decimals', () => {
    expect(formatPriceFrom(650)).toBe('$650');
    expect(formatPriceFrom(1200)).toBe('$1,200');
  });
});
