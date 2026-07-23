import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  FamilyService,
  invitationCode,
  invitationCodeHash,
  normalizeGuardianEmail,
} from '../src/modules/family/family.service';
import { INVITATION_TTL_MS, REQUIRED_LEARNING_CONSENTS, REQUIRED_VOICE_CONSENTS } from '../src/modules/family/family-policy';

test('los códigos nuevos tienen 8 caracteres no ambiguos y nunca necesitan persistirse', () => {
  const generated = new Set(Array.from({ length: 200 }, invitationCode));
  assert.equal(generated.size, 200);
  for (const code of generated) assert.match(code, /^[A-HJ-NP-Z2-9]{8}$/);
});

test('el HMAC está ligado al contexto, normaliza case y no equivale al plaintext', () => {
  const secret = 'test-secret-with-at-least-thirty-two-characters';
  const upper = invitationCodeHash('ABCD2345', secret);
  assert.equal(upper, invitationCodeHash(' abcd2345 ', secret));
  assert.notEqual(upper, 'ABCD2345');
  assert.notEqual(upper, invitationCodeHash('ABCD2346', secret));
});

test('el email se normaliza y la invitación expira exactamente a las 24 horas', () => {
  assert.equal(normalizeGuardianEmail('  Adult@Example.COM '), 'adult@example.com');
  assert.equal(INVITATION_TTL_MS, 24 * 60 * 60 * 1000);
});

test('los gates declaran almacenamiento para aprender y transferencia para voz', () => {
  assert.deepEqual(REQUIRED_LEARNING_CONSENTS, ['service', 'storage']);
  assert.deepEqual(REQUIRED_VOICE_CONSENTS, ['ai_voice', 'international_transfer']);
});

test('un learner gestionado no puede abrir el flujo heredado de invitación', async () => {
  let invitationWrites = 0;
  const tx = {
    $executeRaw: async () => 1,
    user: {
      findUnique: async () => ({
        role: 'learner',
        email: null,
        loginName: 'astro.nova',
      }),
    },
    guardianInvitation: {
      updateMany: async () => {
        invitationWrites += 1;
      },
      create: async () => {
        invitationWrites += 1;
      },
    },
  };
  const service = Object.create(FamilyService.prototype) as FamilyService;
  Object.assign(service, {
    prisma: {
      $transaction: async (callback: (input: typeof tx) => Promise<unknown>) => callback(tx),
    },
    auditService: { recordInTx: async () => undefined },
    outboxService: { emitInTx: async () => undefined },
  });

  await assert.rejects(
    () =>
      service.createInvitation(
        '22222222-2222-4222-8222-222222222222',
        'guardian@example.com',
      ),
    (error: unknown) =>
      error instanceof Error && 'code' in error && error.code === 'FORBIDDEN',
  );
  assert.equal(invitationWrites, 0);
});

test('el learner heredado con email conserva el flujo de invitación', async () => {
  let invitationWrites = 0;
  const expiresAt = new Date(Date.now() + INVITATION_TTL_MS);
  const tx = {
    $executeRaw: async () => 1,
    user: {
      findUnique: async () => ({
        role: 'learner',
        email: 'learner@example.com',
        loginName: null,
      }),
    },
    guardianInvitation: {
      updateMany: async () => {
        invitationWrites += 1;
        return { count: 0 };
      },
      create: async ({ data }: { data: { guardianEmail: string } }) => {
        invitationWrites += 1;
        return { id: 'invitation-id', guardianEmail: data.guardianEmail, expiresAt };
      },
    },
  };
  const service = Object.create(FamilyService.prototype) as FamilyService;
  Object.assign(service, {
    prisma: {
      $transaction: async (callback: (input: typeof tx) => Promise<unknown>) => callback(tx),
    },
    auditService: { recordInTx: async () => undefined },
    outboxService: { emitInTx: async () => undefined },
  });

  const response = await service.createInvitation(
    '22222222-2222-4222-8222-222222222222',
    ' Guardian@Example.COM ',
  );

  assert.equal(invitationWrites, 2);
  assert.equal(response.guardianEmail, 'guardian@example.com');
  assert.equal(response.code.length, 8);
});

test('la migración expira políticas stale y refuerza ageBand/asentimiento antes de confirmar', () => {
  const sql = readFileSync(
    resolve(import.meta.dirname, '../prisma/migrations/20260721051500_family_consent_hardening/migration.sql'),
    'utf8',
  );
  assert.match(sql, /BEGIN;/);
  assert.match(sql, /"expiresAt" TIMESTAMPTZ\(6\) DEFAULT \(CURRENT_TIMESTAMP \+ INTERVAL '24 hours'\)/);
  assert.match(sql, /"role" <> 'learner' OR "ageBand" IS NOT NULL/);
  assert.match(sql, /LOCK TABLE "family"\."consent_grants" IN SHARE ROW EXCLUSIVE MODE/);
  assert.match(sql, /"noticeVersion" <> '2026-07'/);
  assert.match(sql, /youth_assents_active_learner_key/);
  assert.ok(sql.indexOf('"noticeVersion" <> \'2026-07\'') < sql.indexOf('consent_grants_active_learner_purpose_key'));
  assert.match(sql, /COMMIT;/);
});
