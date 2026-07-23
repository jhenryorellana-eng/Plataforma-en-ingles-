import assert from 'node:assert/strict';
import test from 'node:test';
import { urlWithoutSupabaseAuthFragment } from '../src/lib/supabase-auth-fragment.ts';

test('elimina tokens de Supabase y conserva path y query', () => {
  assert.equal(
    urlWithoutSupabaseAuthFragment(
      '/es-PE/login',
      '?verified=1',
      '#access_token=secret&refresh_token=more-secret&type=signup',
    ),
    '/es-PE/login?verified=1',
  );
});

test('elimina fragmentos de error de autenticación de Supabase', () => {
  assert.equal(
    urlWithoutSupabaseAuthFragment(
      '/es-PE/login',
      '',
      '#error_code=otp_expired&error_description=Link%20expired',
    ),
    '/es-PE/login',
  );
});

test('conserva los anclajes que no contienen material de autenticación', () => {
  assert.equal(urlWithoutSupabaseAuthFragment('/es-PE/login', '', '#ayuda'), null);
});
