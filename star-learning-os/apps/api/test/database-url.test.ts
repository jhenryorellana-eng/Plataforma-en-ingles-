import assert from 'node:assert/strict';
import test from 'node:test';
import { withDatabaseConnectionLimit } from '../src/config/database-url';

test('añade un límite conservador a una URL sin parámetros', () => {
  assert.equal(
    withDatabaseConnectionLimit('postgresql://user:pass@db.example.test/postgres', 3),
    'postgresql://user:pass@db.example.test/postgres?connection_limit=3',
  );
});

test('conserva los parámetros existentes', () => {
  assert.equal(
    withDatabaseConnectionLimit('postgresql://db/postgres?sslmode=require', 3),
    'postgresql://db/postgres?sslmode=require&connection_limit=3',
  );
});

test('respeta un límite definido por infraestructura', () => {
  const configured = 'postgresql://db/postgres?connection_limit=1&pgbouncer=true';
  assert.equal(withDatabaseConnectionLimit(configured, 3), configured);
});
