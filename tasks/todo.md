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
- [x] 14. **Embudo de entrada completo** (smoke 48/48 + recorrido real en navegador con familia nueva "Valeria/Carmen"):
  - StarMap Preview público sin registro (§7.2, informativo, sin persistencia)
  - Registro con age gate (rechaza <12; banda 12–13/14–17/18+ por año de nacimiento)
  - Invitación del alumno → registro del apoderado → vínculo por código (A1; proveedor A2 = bloqueador externo #6)
  - Portal familiar: aceptar invitación + **interruptores de consentimiento por finalidad** con otorgar/revocar (CNS-01; revocar voz bloquea sesiones al instante)
  - Asentimiento juvenil con verificación de comprensión (CNS-02)
  - Inscripción bloqueada técnicamente sin vínculo+consentimiento (§15.3)
  - **StarMap 360 multietapa**: router (12) → módulo ajustado al nivel (3) → **muestra de Writing** con score heurístico que entra al perfil y a la regla de mínimo §7.4
  - Prueba técnica de micrófono/altavoz antes de voz (TEC-01) con fallback a modo texto (TLK-04)
  - Fixes: CORS PATCH, Content-Type en POST sin cuerpo
- [x] 15. **Dashboard del Docente (Curriculum Studio, §8.1)** — smoke 55/55 + verificado en navegador:
  - El docente sugiere un TEMA → el autor IA redacta la lección completa con la Metodología (objetivo observable, secuencia STAR, transferencia, writing con rúbrica, misión de voz con guion)
  - El tema es CONTEXTO: las actividades se anclan a las competencias del mapa oficial — el estándar no cambia
  - Flujo editorial real: borrador → revisión docente → publicar/descartar; el borrador es INVISIBLE para el alumno (404) hasta publicar (§4.2: quien crea no publica)
  - Autor IA por adaptador: OpenAI (OPENAI_TEXT_MODEL) o plantillas locales sin API key
  - Overview con cobertura de competencias y temario completo por unidad
  - Estado editorial en el modelo (draft/published/retired) filtrado en today/path/sesiones/voz
- [x] 16. **Acabado premium v6** (commit a727f33; lint limpio, smoke 55/55, capturas v8-*):
  - Atmósfera: malla de gradiente animada + grano fractal en toda la app
  - Luz: sheen recorrido en botones/héroe, sombras con luz interior, glow en anillos de progreso
  - Movimiento: borde cónico animado (Studio), dock de cristal flotante, resorte `.lift`, skeletons shimmer, ecualizador vivo en la llamada, halos de mentor/login; `prefers-reduced-motion` respetado
  - Robustez: getUserMedia con timeout 6 s (TEC-01 jamás cuelga → modo texto TLK-04)

### Arranque local (recordatorio)
`pnpm install --ignore-scripts && pnpm db:up && pnpm db:migrate && pnpm db:seed && pnpm dev:api` + `pnpm dev:web`
(los scripts postinstall se saltan a propósito: ver lessons.md sobre script-shell)

## Decisión de foco declarada por Henry (2026-07-16)

**Público objetivo:** jóvenes latinos en Estados Unidos + Latinoamérica; bidireccional
inglés↔español; meta aspiracional: venir a estudiar a EE. UU. (TOEFL).
- Es el insumo directo para **D01 (mercado del piloto)** — formalizarlo en Decisiones_para_concretar.
- **Consecuencia legal**: operar con menores en EE. UU. activa el gate **COPPA + leyes estatales**
  (Arquitectura §19.1) además del marco peruano. Añadir a la revisión legal (bloqueador #7).
- En código: autor IA orientado a contextos de admisiones/becas/vida universitaria EE. UU.;
  `spanish-path` sembrado como programa DRAFT (invisible en catálogo hasta gates §23.1).
- Contenido demo fuera de foco (Canadá/astronomía) retirado vía flujo editorial.

## Producción real — decisión Supabase (Henry, 2026-07-16)

Henry decidió usar **Supabase** como base de datos de producción (reemplaza a Cloud SQL
del Stack v1.0 §17 para esta fase; GCP queda para cuando se active esa cuenta). La
arquitectura lo permite sin tocar código: todo pasa por Prisma vía `DATABASE_URL`.

**Plan de subida (en orden):**
1. ✅ **BD de producción en Supabase** (2026-07-16): proyecto "Academia de ingles"
   (`addkqfebkufynjovqxsv`, región sa-east-1, Postgres 17.6, org wakriowwiycapmfzzxql).
   - 5 migraciones aplicadas vía MCP + ledger `public._prisma_migrations` con checksums
     reales (futuros `prisma migrate deploy` reconocen el estado).
   - RLS habilitado en las 33 tablas SIN policies = denegación total a anon/PostgREST;
     la API entra por conexión directa (owner). Advisor de seguridad: solo INFOs esperados.
   - Data curada insertada (88 filas): 2 programas, catálogo B1, 4 lecciones PUBLICADAS
     en foco (University Life + Beca universitaria EE. UU.), 13 actividades, 22 ítems
     diagnóstico, familia demo (6 usuarios @demo.starbiz.pe — purgar antes del lanzamiento).
   - EXCLUIDO a propósito: lecciones de astronomía duplicadas del smoke (encoding roto),
     units U02/U04/U06/U07, y toda la data transaccional de pruebas.
   - ✅ API conectada y VERIFICADA contra Supabase (2026-07-16): login staff/learner,
     Studio overview (4 publicadas, 6/6 competencias), catálogo (draft oculto),
     preview público (5 ítems), UTF-8 íntegro. Conexión Session pooler ~1.7 s el
     primer handshake TLS desde Perú; la API en producción irá en la misma región.
   - ⚠️ PENDIENTE DE SEGURIDAD: la contraseña de la BD quedó pegada en el chat
     (2026-07-16) — ROTARLA en Supabase (Settings → Database → Reset) y actualizar
     .env/hosting ANTES del lanzamiento público.
   - El .env de la raíz ahora apunta a Supabase (la línea local quedó comentada
     para volver al Postgres embebido cuando se quiera).
2. ✅ **Auth real con contraseña** (2026-07-16, smoke 59/59 + verificado en navegador):
   - `IdentityProvider` adaptador: `SupabaseIdentityProvider` (Admin API server-side,
     usuarios creados con `email_confirm:true` = **registro instantáneo SIN verificación
     de correo — decisión de Henry**; el correo queda solo para recuperar contraseña)
     + `MockIdentityProvider` en memoria (dev/smoke sin claves).
   - Registro alumno/apoderado ahora exige contraseña (zod min 8); registro duplicado
     → 409 (ya NO abre sesión sobre cuenta ajena); `POST /auth/login`;
     `POST /auth/forgot-password` (respuesta uniforme, no revela existencia).
   - `authId` en identity.users (migración `20260716034500_add_auth_id`, aplicada a
     Supabase vía `migrate deploy` — el ledger de checksums funcionó); tras login
     exitoso el authId del proveedor es la autoridad (re-vínculo automático).
   - dev-login: 403 si `NODE_ENV=production`; cookie `secure` en producción; el bloque
     demo del /login solo aparece con `NEXT_PUBLIC_DEMO_LOGIN=true` (apps/web/.env.local).
   - ✅ **Supabase Auth real ACTIVADO** (2026-07-16): registro 201 crea la cuenta en
     auth.users CONFIRMADA de inmediato (sin correo de verificación), login 201,
     contraseña mala 401, duplicado 409 — verificado E2E contra el proyecto real;
     usuario de prueba borrado (Admin API + identity.users).
   - ⚠️ ROTACIÓN pre-lanzamiento (ampliada): contraseña de BD **y** SUPABASE_SECRET_KEY
     **y** legacy service_role JWT — los tres se pegaron en el chat (2026-07-16).
     En el dashboard: Reset database password + rotar/deshabilitar API keys legacy.
3. ☐ Hosting API NestJS: Railway/Render (proceso persistente — el outbox worker lo
   necesita; serverless NO sirve tal cual). Requiere cuenta de Henry.
4. ☐ Web en Vercel con **rewrite `/v1/* → API`** (mismo dominio = cookies same-site,
   sin SameSite=None). Hobby prohíbe uso comercial → Pro $20/mes para producción.
5. ☐ Config producción: SESSION_SECRET fuerte, cookies secure, CORS al dominio real,
   OPENAI_API_KEY (voz real) + OPENAI_TEXT_MODEL (autor IA real).

## Bloqueadores externos (solo Starbiz puede resolverlos — NO son código)

| # | Dependencia | Referencia | Estado |
|---|---|---|---|
| 1 | Respuestas D01–D25 | Decisiones_para_concretar_STAR_v1.md | Pendiente Henry |
| 2 | ZDR aprobado por OpenAI (gate 12–13) | Stack §1.1 | Sin iniciar |
| 3 | Cuenta GCP + proyectos (star-minors-prod separado) | Stack §17.1 | Sin iniciar |
| 4 | OPENAI_API_KEY (voz real; sin ella corre modo demo) | Stack §8 | Clave recibida y VÁLIDA (2026-07-16): acceso a gpt-5, gpt-4.1 y gpt-realtime. PERO la cuenta OpenAI **no tiene créditos** (insufficient_quota) → quedó comentada en .env para no romper voz demo/plantillas. Integración verificada: con clave activa el Studio usa `openai-authoring` (gpt-5-mini configurado). ACCIÓN HENRY: cargar saldo en platform.openai.com → Billing; luego descomentar OPENAI_API_KEY en .env y reiniciar API. Rotar esta clave pre-lanzamiento (expuesta en chat). |
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
