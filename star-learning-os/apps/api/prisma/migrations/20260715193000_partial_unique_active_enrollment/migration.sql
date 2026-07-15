-- Una sola inscripción viva por alumno y programa (Arquitectura §9.4).
-- Índice parcial: no expresable en el schema de Prisma.
CREATE UNIQUE INDEX IF NOT EXISTS one_active_enrollment_per_program_idx
  ON learning.enrollments ("learnerId", "programId")
  WHERE status IN ('pending_diagnostic', 'active', 'paused');

-- Outbox pendiente: barrido eficiente de eventos no publicados (Arquitectura §9.4).
CREATE INDEX IF NOT EXISTS outbox_unpublished_idx
  ON audit.outbox_events ("sequenceId")
  WHERE "publishedAt" IS NULL;
