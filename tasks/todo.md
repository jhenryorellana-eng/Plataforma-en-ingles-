# STAR Learning OS — Estado y plan (XL)

**Última actualización:** 2026-07-20 (hardening lógico verificado; Supabase 11/11 migraciones; dominio 55/55 + API 54/54; E2E real auth/familia)
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
   - 11 migraciones aplicadas y ledger `public._prisma_migrations` al día. Las cuatro
     de hardening 2026-07-20 se aplicaron con `prisma migrate deploy`; el estado remoto
     queda `Database schema is up to date`.
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
3. ✅ **API en Railway** (2026-07-17): proyecto "starbiz", servicio conectado al repo
   (rootDirectory star-learning-os, build pnpm filtrado, start node apps/api/dist/main.js,
   PORT/API_PORT 4000, SESSION_SECRET fuerte generado, NODE_ENV=production). Dominio:
   plataforma-en-ingles-production.up.railway.app. Auto-deploy por push a main ✓.
   Todo configurado vía API GraphQL de Railway con el token de Henry (rotar, en chat).
   Intento previo de API serverless en Vercel: descartado con evidencia (bundle
   incompleto en monorepo pnpm + cap 60s degradaría el autor IA + sin worker).
   Nota: queda un servicio vacío "pacific-consideration" que Henry puede borrar.
4. ✅ **Web conectada** (2026-07-17): rewrite same-origin `/v1/* → Railway` en
   vercel.json (cookies first-party en todos los navegadores) + NEXT_PUBLIC_API_URL.
   Gotchas resueltos: framework null del proyecto (vercel.json), .npmrc con ruta
   Windows rompía pnpm en Linux, `vercel env add` con printf sin \n guarda VACÍO
   (usar echo), build cache no invalida por env nueva (--force).
5. ✅ **RECORRIDO E2E EN PRODUCCIÓN VERIFICADO** (2026-07-17, Playwright): registro
   de Mateo Quispe (14) con contraseña real → onboarding apoderado con código →
   registro de Carmen → vínculo → 4 consentimientos → login con contraseña →
   asentimiento → inscripción → StarMap 360 corriendo (Pregunta 1 de 16).
   Capturas v10/v11. Cuentas de prueba vivas para que Henry explore:
   mateo.prueba@starbiz-test.pe / carmen.prueba@starbiz-test.pe.
   **Hallazgo y fix en caliente**: la inscripción no exigía el asentimiento juvenil
   (CNS-02) — gate añadido al enrollment + check negativo en smoke (60/60).
   ☐ Pendiente config: OPENAI_API_KEY en Railway cuando Henry cargue créditos.
   ☐ Vercel Hobby prohíbe uso comercial → Pro $20/mes al cobrar.

## Auditoría 2026-07-18 + Pack A (protección y economía) — COMPLETADO ✅

Auditoría completa (2 subagentes + revisión propia + smoke en runtime): build 4/4, tests 55/55,
lint limpio, smoke E2E **93/93** (60 anteriores + 33 nuevos anti-farming/gates, repetibles con
usuarios frescos por corrida). Hallazgos clave y su estado:

- [x] **A1 Economía anti-farming**: `completeSession` exige ≥1 evidencia nueva y otorga UNA vez
  por lección (`hasGrantForLessonInTx`); voz exige ≥60 s activos + tope de 5 premios/día;
  dedup de submissions normalizado (gap_fill trim/lowercase) + premio solo al PRIMER acierto
  por actividad; todas las Novas van siempre a `enrollment.learnerId`.
- [x] **A2 Voz (web)**: heartbeat real (endSession estable con `elapsedRef` — antes el efecto
  se reiniciaba cada segundo y jamás disparaba); errores visibles en fase live; Pausar muta
  mic + silencia remoto + cancela TTS; reporte de seguridad ya NO finge éxito al fallar;
  guard doble-submit en startMission; TTS/peer/mic se limpian al salir o desmontar.
- [x] **A3 Protección**: banda etaria por EDAD GARANTIZADA (`ageBandForBirthYear` en domain,
  8 tests nuevos) — un posible menor jamás clasifica como adulto; `minimumAge` de programa
  contra edad garantizada de la banda (un 13+ ya no admite a un niño de 12); Sprint bloqueado
  también en el alta (antes solo al cambiar ritmo); escritura académica solo-alumno
  (`assertLearnerSelf` en sessions/submissions/voz — apoderado/staff no generan evidencia).
- [x] Lección aprendida: `pnpm dev:api` (tsx) NO emite metadata DI con Node 25 — API local
  siempre compilada (`node dist/main.js`); documentado en tasks/lessons.md.
- [x] **Pack B robustez (2026-07-19, smoke 95/95)**: player/diagnóstico separan bootError
  (pantalla completa + reintento) de submitError (inline — la respuesta del alumno jamás se
  destruye por un corte de red); EmptyState si focusActivityId no existe; finish() reintenta
  el cierre; writingText se limpia tras enviar; gap_fill valida huecos REALES del texto;
  MicTest onDone en useEffect (no en render); gradientes SVG con id derivado de props
  (adiós hydration mismatch por contador de módulo); logout navega siempre (finally);
  boot de voz con error visible + reintento; onboarding sin "Cargando…" eterno;
  resolveEnrollment distingue anónimo (/login) de sin-inscripción (/enroll);
  compra atómica (el UPDATE exige saldo — sin balance negativo por carrera);
  heartbeat/end de voz condicionales a sesión abierta (no resucita, no duplica coste);
  repasos con cierre condicional e idempotentes tras timeout; aceptar invitación
  exige el correo invitado (un código visto por un tercero ya no vincula).
- [x] **Verificación E2E en navegador real (2026-07-19, Playwright 27/27)**: login demo → Hoy →
  lección (feedback correcto + **error inline con reintento** tras corte de red simulado) → voz
  completa (mic test con dispositivo fake, saludo, turno del alumno, **pausa que detiene el
  cronómetro de verdad**, **reporte que ya no finge éxito**, heartbeat activo server-side,
  "Misión terminada", **tope diario anti-farming verificado**: 5.º premio del día concedido,
  6.º bloqueado) → avatar/tienda → progreso → portal familiar → consola staff. Sin errores de
  hidratación ni pageerrors. Arnés: `.shots/tool/verify-pack.cjs` (+`verify-login.cjs`).
  Hallazgo y fix en caliente: `WEB_ORIGIN` debe igualar el puerto de la web o TODAS las
  llamadas client-side mueren por CORS (el "No pudimos conectar" del login) — lessons.md.
- [ ] **Pack C pendiente**: llamada inmersiva (ocultar dock/topbar en live), Guardar sticky en
  avatar, fin de misión centrada, Nova con más presencia en preview, retirar sonda audioDebug,
  OPENAI_API_KEY activa sin créditos rompe modo demo local (fallback a mock).

## Hardening de producción 2026-07-20 — LÓGICA + SUPABASE VERIFICADOS; RUNTIME PENDIENTE

- [x] Sesiones STAR opacas, hasheadas y revocables en PostgreSQL; logout invalida en servidor y
  cada request recarga rol/capacidades actuales.
- [x] Arranque fail-closed en producción para DB local, secreto corto/default, origen sin HTTPS o
  variables incompletas de Supabase Auth.
- [x] Capacidades de staff + administración por API + cuatro ojos: el autor no publica su borrador.
- [x] Safety con pertenencia de sesión, triage, resolución obligatoriamente motivada, asignación,
  auditoría y controles en la consola.
- [x] Voz acredita solo segundos compatibles con tiempo de pared entre heartbeats; `activeSeconds`
  del cliente ya no puede fabricar consumo ni premios.
- [x] Health live/ready, headers defensivos, Node 22 fijado y GitHub Actions con PostgreSQL 17,
  migraciones, seed, lint, typecheck, tests, build y smoke E2E.
- [x] Migración `20260720235301_production_hardening` aplicada y verificada en PostgreSQL local:
  RLS activo en `identity.auth_sessions`/`staff_grants`, grants de staff backfilled, sin drift.
- [x] Sesión/login protegidos contra la carrera reset↔login mediante `credentialVersion` y CAS;
  recovery real acepta la representación Supabase `amr=otp`, consume el bearer una sola vez,
  revoca sesiones STAR y hace logout global en Supabase.
- [x] Invitaciones familiares: HMAC, 8 caracteres, 24 h, rotación/consumo serializados y código
  no reexpuesto; consentimiento/asentimiento versionados y revocación efectiva de sesiones.
- [x] Voz: revalidación pos-provider bajo el mismo lock de política, cero secreto/sesión tras una
  revocación, heartbeat sin tiempo inventado y cap diario de Novas serializado.
- [x] Verificación final: dominio **55/55**, API **54/54**, lint y 4 typechecks limpios,
  builds API+web, migraciones completas desde cero en PostgreSQL y Supabase **11/11**.
- [x] E2E real Supabase: auth reset/replay/cookies/passwords PASS; familia/consentimiento
  **27 PASS, 0 FAIL** usando apoderados Admin temporales; limpieza DB/Auth completa.
- [ ] Alta pública de apoderado bloqueada externamente: Supabase Auth devuelve
  `over_email_send_rate_limit` (429). Configurar SMTP propio y repetir confirmación por correo.
- [ ] Rotar credenciales expuestas y desplegar el runtime nuevo en Railway/Vercel. Runbook:
  `star-learning-os/docs/PRODUCTION_GATES.md`.

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
| 11 | SMTP transaccional para confirmación/reset | Supabase Auth | Bloqueado: servicio integrado devolvió 429 en E2E real |
| 12 | Receptor HTTPS del outbox + secreto HMAC | Producción API | Sin definir; el runtime nuevo falla cerrado sin ellos |
| 13 | Rate limit distribuido antes de múltiples réplicas | Auth/familia | Hoy es local por proceso |

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
