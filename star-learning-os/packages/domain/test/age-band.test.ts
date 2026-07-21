import { describe, expect, it } from 'vitest';
import { ageBandForBirthYear, BAND_GUARANTEED_AGE, guaranteedAgeForBirthYear } from '../src/types';

const YEAR = 2026;

describe('guaranteedAgeForBirthYear — peor caso (nacido el 31 de diciembre)', () => {
  it('es un año menos que la edad nominal', () => {
    expect(guaranteedAgeForBirthYear(2012, YEAR)).toBe(13);
    expect(guaranteedAgeForBirthYear(2008, YEAR)).toBe(17);
  });
});

describe('ageBandForBirthYear — siempre la banda más restrictiva posible', () => {
  it('un niño que puede tener 11 NO entra aunque el año nominal diga 12', () => {
    expect(ageBandForBirthYear(2014, YEAR)).toBeNull();
  });

  it('el límite 12/13 garantizado entra en la banda juvenil más protegida', () => {
    expect(ageBandForBirthYear(2013, YEAR)).toBe('y12_13');
  });

  it('quien puede tener 13 o 14 se queda en 12-13 (la banda más restrictiva)', () => {
    expect(ageBandForBirthYear(2012, YEAR)).toBe('y12_13');
  });

  it('quien puede tener 17 NUNCA se clasifica como adulto (el agujero cerrado)', () => {
    expect(ageBandForBirthYear(2008, YEAR)).toBe('t14_17');
  });

  it('adulto solo cuando los 18 están garantizados', () => {
    expect(ageBandForBirthYear(2007, YEAR)).toBe('a18_plus');
  });

  it('rechaza años claramente de menores de 12', () => {
    expect(ageBandForBirthYear(2020, YEAR)).toBeNull();
  });
});

describe('BAND_GUARANTEED_AGE — minimumAge de programas contra edad garantizada', () => {
  it('un programa 13+ no admite la banda 12-13 (garantiza solo 12)', () => {
    expect(BAND_GUARANTEED_AGE.y12_13).toBeLessThan(13);
    expect(BAND_GUARANTEED_AGE.t14_17).toBeGreaterThanOrEqual(13);
  });
});
