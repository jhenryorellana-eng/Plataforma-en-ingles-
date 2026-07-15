# STAR Learning OS — Estado y plan (XL)

**Última actualización:** 2026-07-15
**Mandato:** construir la plataforma definida en los 5 documentos raíz, con corte vertical funcional local primero (Fase 0/1 de Stack v1.0 §19), esquema multi-programa desde el día 1 (Arquitectura Multilingüe, nota de arranque en verde §24).

## Decisiones de construcción adoptadas (derivadas de los documentos)

- Monorepo `star-learning-os/` con pnpm + Turborepo + TypeScript estricto (Stack §4.1).
- API: NestJS + adaptador Fastify, REST `/v1`, monolito modular (Stack §4.3).
- Datos: PostgreSQL 17 + Prisma multiSchema; esquemas `identity, family, catalog, curriculum, learning, assessment, ai, safety, commerce, audit` (Arquitectura §9).
- Web: Next.js App Router + Tailwind, rutas `/{locale}/learn/{programCode}/...` (Arquitectura §16); interfaz ES (D13).
- Proveedores externos SIEMPRE detrás de adaptadores (Arquitectura §6.1): Identity Platform → `DevIdentityProvider` local; OpenAI Realtime → `OpenAIRealtimeProvider` (real con `OPENAI_API_KEY`) + `MockVoiceProvider` (demo sin clave); pagos → pendiente D25.
- BD local sin Docker: PostgreSQL embebido de desarrollo (binarios oficiales vía npm) en `.local/`; producción = Cloud SQL (ADR-002).
- i18n: segmento `[locale]` + diccionario propio mínimo (ES único idioma del MVP, D13); migrar a next-intl cuando haya 2+ locales reales.

## Fase actual — Corte vertical local

- [ ] 1. Documentación corregida (modelo insignia, SLOs, mermaid, horas, NOVA, Prisma, greenfield, COPPA)
- [ ] 2. Repo git inicializado + commit de documentos
- [ ] 3. Monorepo base (pnpm, turbo, tsconfig, prettier, eslint)
- [ ] 4. `packages/contracts` — esquemas Zod y DTOs `/v1`
- [ ] 5. `packages/domain` — motores puros con tests: mastery (§12.2), repaso espaciado 1/3/7/14/30, promoción, política de voz juvenil (consent/ZDR/cuota 90-150-240 y umbrales 70/90/100), placement multietapa
- [ ] 6. Prisma schema multi-programa + migración inicial + seed English Path B1 (1 unidad, competencias, actividades, rúbricas, contrato de lección, misión de voz)
- [ ] 7. `apps/api` — módulos: auth(dev), family/consent, catalog, enrollment, diagnostic, learning (today/sessions/submissions→evidencia→mastery), voice (ephemeral + política), safety, human-review, audit/outbox, usage
- [ ] 8. BD embebida levantada + migrate + seed + smoke test de endpoints
- [ ] 9. `apps/web` — login dev, onboarding familiar (edad→vínculo→consentimientos→asentimiento), Hoy, lección (mcq/gap/writing), voz (WebRTC real o modo demo), Ruta, Repasar, Progreso (4 métricas separadas), resumen apoderado
- [ ] 10. Build completo verde + tests verdes + smoke E2E
- [ ] 11. README + runbook de arranque local
- [ ] 12. Commit final

## Bloqueadores externos (solo Starbiz puede resolverlos — NO son código)

| # | Dependencia | Referencia | Estado |
|---|---|---|---|
| 1 | Respuestas D01–D25 | Decisiones_para_concretar_STAR_v1.md | Pendiente Henry |
| 2 | ZDR aprobado por OpenAI (gate 12–13) | Stack §1.1 | Sin iniciar |
| 3 | Cuenta GCP + proyectos (star-minors-prod separado) | Stack §17.1 | Sin iniciar |
| 4 | OPENAI_API_KEY (voz real) | Stack §8 | Sin proporcionar |
| 5 | Proveedor de pagos Perú (D25) | Stack §21 | Sin elegir |
| 6 | Proveedor de verificación de apoderado (A2) | Stack §5.4 | Sin elegir |
| 7 | Revisión legal peruana + evaluación de impacto | Stack §23 | Sin iniciar |
| 8 | Responsable de salvaguarda + cobertura | Stack §1.4 | Sin nombrar |
| 9 | Currículo B1→B2 completo (sílabo, banco, rúbricas) | Metodología §22 | Solo muestra seed |
| 10 | Contenido y equipo ELE para Spanish Path | Arquitectura §17.2 | Post-MVP (flag apagado) |

## Post-corte-vertical (Fase 2 del Stack — no en esta sesión)

- StarMap 360 completo multietapa con banco calibrado
- Backoffice Curriculum/Assessment Studio UI + Safeguarding Console UI
- Sideband WebSocket server↔OpenAI endurecido (hoy: control por API + límites duros)
- Pagos, suscripciones y prorrateo (bloqueado por D25)
- Terraform GCP + CI/CD GitHub Actions + Workload Identity
- Gold sets 200+/100+ y pipeline de evals de IA
- PWA offline, accesibilidad WCAG 2.2 AA auditada, k6, pentest
