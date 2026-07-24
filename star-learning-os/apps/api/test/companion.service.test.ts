import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyLearner } from '../src/modules/companion/companion.service';

const NOW = new Date('2026-07-23T12:00:00.000Z');

test('prioriza a quien aún necesita completar el diagnóstico', () => {
  assert.equal(
    classifyLearner(
      {
        enrollmentStatus: 'pending_diagnostic',
        pendingReviews: 0,
        reviewRequired: 0,
        developing: 0,
        lastActivityAt: null,
        focusSkill: null,
      },
      NOW,
    ),
    'awaiting_start',
  );
});

test('presenta como apoyo humano una revisión pendiente o una inscripción pausada', () => {
  assert.equal(
    classifyLearner(
      {
        enrollmentStatus: 'active',
        pendingReviews: 1,
        reviewRequired: 0,
        developing: 0,
        lastActivityAt: NOW,
        focusSkill: 'speaking',
      },
      NOW,
    ),
    'needs_support',
  );
  assert.equal(
    classifyLearner(
      {
        enrollmentStatus: 'paused',
        pendingReviews: 0,
        reviewRequired: 0,
        developing: 0,
        lastActivityAt: NOW,
        focusSkill: null,
      },
      NOW,
    ),
    'needs_support',
  );
});

test('traduce desarrollo o inactividad a una recomendación de práctica', () => {
  assert.equal(
    classifyLearner(
      {
        enrollmentStatus: 'active',
        pendingReviews: 0,
        reviewRequired: 0,
        developing: 2,
        lastActivityAt: NOW,
        focusSkill: 'writing',
      },
      NOW,
    ),
    'needs_practice',
  );
  assert.equal(
    classifyLearner(
      {
        enrollmentStatus: 'active',
        pendingReviews: 0,
        reviewRequired: 0,
        developing: 0,
        lastActivityAt: new Date('2026-07-10T12:00:00.000Z'),
        focusSkill: null,
      },
      NOW,
    ),
    'needs_practice',
  );
});

test('no genera pendientes artificiales para un alumno activo y al día', () => {
  assert.equal(
    classifyLearner(
      {
        enrollmentStatus: 'active',
        pendingReviews: 0,
        reviewRequired: 0,
        developing: 0,
        lastActivityAt: new Date('2026-07-22T12:00:00.000Z'),
        focusSkill: null,
      },
      NOW,
    ),
    'on_track',
  );
});
