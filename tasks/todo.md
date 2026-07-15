# STAR Learning OS — Estado y plan (XL)

**Última actualización:** 2026-07-15 (corte vertical local VERIFICADO)
**Mandato:** construir la plataforma definida en los 5 documentos raíz, con corte vertical funcional local primero (Fase 0/1 de Stack v1.0 §19), esquema multi-programa desde el día 1 (Arquitectura Multilingüe, nota de arranque en verde §24).

## Decisiones de construcción adoptadas (derivadas de los documentos)

- Monorepo `star-learning-os/` con pnpm + Turborepo + TypeScript estricto (Stack §4.1).
- API: NestJS + adaptador Fastify, REST `/v1`, monolito modular (Stack §4.3).
- Datos: PostgreSQL 17 + Prisma multiSchema; esquemas `identity, family, catalog, curriculum, learning, assessment, ai, safety, audit` (Arquitectura §9).
- Web: Next.js 16 App Router + Tailwind v4, rutas `/{locale}/learn/{programCode}/...` (Arquitectura §16); interfaz ES (D13).
- Proveedores externos SIEMPRE detrás de adaptadores (Arquitectura §6.1): Identity Platform → `DevIdentityProvider` local; OpenAI Realtime → `OpenAiRealtimeProvider` (real con `OPENAI_API_KEY`) + `MockVoiceProvider` (demo sin clave); pagos → pendiente D25.
- BD local sin Docker: PostgreSQL 17.10 embebido (binarios oficiales vía npm) en `.local/`; producción = Cloud SQL (ADR-002).
- i18n: segmento `[locale]` + textos ES directos (único idioma del MVP, D13); migrar a next-intl cuando haya 2+ locales reales.

## Fase actual — Corte vertical local: COMPLETADO Y VERIFICADO ✅

- [x] 1. Documentación corregida (modelo insignia, SLOs, mermaid, horas, NOVA, Prisma, greenfield, COPPA)
- [x] 2. Repo git inicializado + commits
- [x] 3. Monorepo base (pnpm, turbo, tsconfig, prettier, eslint) — build 4/4 verde
- [x] 4. `packages/contracts` — esquemas Zod y DTOs `/v1`
- [x] 5. `packages/domain` — motores puros: mastery §12.2, repaso 1/3/7/14/30, promoción §12.5, política de voz juvenil, placement §7.4 — **43/43 tests verdes**
- [x] 6. Prisma schema multi-programa (9 esquemas) + 2 migraciones + seed English Path B1 (3 lecciones, 8 actividades, 12 ítems diagnóstico, familia demo)
- [x] 7. `apps/api` — auth(dev), family/consent, catalog, enrollment, diagnostic, learning (STAR Loop transaccional), voice (gates + mock/realtime), safety P0–P3, human-review, outbox/auditoría, usage
- [x] 8. BD embebida + migrate + seed + **smoke E2E: 25/25 PASS** (incluye gate exacto `ZDR_REQUIRED` para 12–13, revisión humana de placement, aislamiento entre alumnos, cliente sin claves de respuesta)
- [x] 9. `apps/web` — login, diagnóstico, Hoy, lección (mcq/gap/writing), voz (orbe + Pausar/Silenciar/Reportar/Salir), Ruta, Repasar, Progreso (4 métricas), portal apoderado, consola staff — **verificado en navegador real** (capturas: `star-hoy-diego.png`, `star-zdr-gate-lucia.png`)
- [x] 10. Build completo verde + tests verdes + smoke E2E verde
- [x] 11. README + runbook (`star-learning-os/README.md`, `scripts/smoke.sh`)
- [x] 12. Commits finales
- [x] 13. Flujo "tal cual Metodología §7.5": inscripción → diagnóstico → **selector de ritmo con proyección §9.3** (fecha estimada por nivel de entrada, Sprint bloqueado para 12–13 por D04, cambio de cupos al confirmar) → plan diario. Smoke 28/28 + verificado en navegador.

### Arranque local (recordatorio)
`pnpm install --ignore-scripts && pnpm db:up && pnpm db:migrate && pnpm db:seed && pnpm dev:api` + `pnpm dev:web`
(los scripts postinstall se saltan a propósito: ver lessons.md sobre script-shell)

## Bloqueadores externos (solo Starbiz puede resolverlos — NO son código)

| # | Dependencia | Referencia | Estado |
|---|---|---|---|
| 1 | Respuestas D01–D25 | Decisiones_para_concretar_STAR_v1.md | Pendiente Henry |
| 2 | ZDR aprobado por OpenAI (gate 12–13) | Stack §1.1 | Sin iniciar |
| 3 | Cuenta GCP + proyectos (star-minors-prod separado) | Stack §17.1 | Sin iniciar |
| 4 | OPENAI_API_KEY (voz real; sin ella corre modo demo) | Stack §8 | Sin proporcionar |
| 5 | Proveedor de pagos Perú (D25) | Stack §21 | Sin elegir |
| 6 | Proveedor de verificación de apoderado (A2) | Stack §5.4 | Sin elegir |
| 7 | Revisión legal peruana + evaluación de impacto | Stack §23 | Sin iniciar |
| 8 | Responsable de salvaguarda + cobertura | Stack §1.4 | Sin nombrar |
| 9 | Currículo B1→B2 completo (sílabo, banco, rúbricas) | Metodología §22 | Solo unidad muestra |
| 10 | Contenido y equipo ELE para Spanish Path | Arquitectura §17.2 | Post-MVP (flag apagado) |

## Siguiente fase (Fase 2 del Stack — MVP de piloto)

- StarMap 360 completo multietapa (hoy: router simplificado de 12 ítems)
- Contenido B1→B2 para 8–12 semanas (equipo académico + Curriculum Studio)
- Backoffice de autoría (Curriculum/Assessment Studio UI) + Safeguarding Console UI
- Sideband WebSocket server↔OpenAI endurecido (hoy: control por API + límites duros + timebox)
- Scorer de Writing/Speaking versionado con modelo (hoy: heurístico honesto de baja confianza → cola humana)
- Onboarding familiar real (invitación + verificación A2; hoy: familia pre-vinculada por seed)
- Idempotency-Key middleware genérico (hoy: dedup por inputHash en evidencia + unique constraints)
- Pagos y suscripciones (bloqueado por D25)
- Terraform GCP + CI/CD GitHub Actions + Workload Identity
- Gold sets 200+/100+ y pipeline de evals de IA
- PWA offline, WCAG 2.2 AA auditada, k6, pentest
