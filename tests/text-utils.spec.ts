import { test, expect } from '@playwright/test';
import { normalizeText, startsWithLetter } from '../src/utils/textUtils';

test.describe('utilidades de texto', () => {
  test('normaliza tildes, ñ, mayúsculas, espacios y ü', () => {
    expect(normalizeText('  Árbol Verde  ')).toBe('arbolverde');
    expect(normalizeText('Ñandú')).toBe('nandu');
    expect(normalizeText('ÜBER')).toBe('uber');
  });

  test('comprueba la letra ignorando espacios y tildes', () => {
    expect(startsWithLetter('  Árbol', 'A')).toBe(true);
    expect(startsWithLetter('Ñandú', 'Ñ')).toBe(true);
    expect(startsWithLetter('Perro', 'M')).toBe(false);
    expect(startsWithLetter('Mono', 'M')).toBe(true);
  });
});
