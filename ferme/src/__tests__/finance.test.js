// ═══════════════════════════════════════════════════════════
//  src/__tests__/finance.test.js
//  Tests moteur finance — ROI, totaux, formatage
// ═══════════════════════════════════════════════════════════

import { formatMontant } from '../engine/finance';

describe('formatMontant', () => {
  test('formate un nombre entier', () => {
    expect(formatMontant(15000)).toBe('15000 FCFA');
  });

  test('formate zéro', () => {
    expect(formatMontant(0)).toBe('0 FCFA');
  });

  test('accepte null/undefined → 0', () => {
    expect(formatMontant(null)).toBe('0 FCFA');
    expect(formatMontant(undefined)).toBe('0 FCFA');
  });

  test('devise personnalisée', () => {
    expect(formatMontant(1000, 'XOF')).toBe('1000 XOF');
  });
});
