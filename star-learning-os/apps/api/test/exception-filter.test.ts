import assert from 'node:assert/strict';
import test from 'node:test';
import { isDatabaseCapacityError } from '../src/common/exception.filter';

test('reconoce agotamiento de Supavisor y timeout de Prisma', () => {
  assert.equal(isDatabaseCapacityError({ message: 'FATAL: (EMAXCONNSESSION) max clients reached' }), true);
  assert.equal(isDatabaseCapacityError({ code: 'P2024', message: 'Timed out fetching a connection' }), true);
});

test('no convierte errores de aplicación comunes en indisponibilidad', () => {
  assert.equal(isDatabaseCapacityError(new Error('Ítem de diagnóstico no encontrado')), false);
});
