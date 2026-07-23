# Gates de producción

Este documento separa lo que la aplicación puede verificar al arrancar de lo que
requiere una decisión, contrato o responsable externo.

## Estado verificado — 2026-07-22

- Local: **12/12 migraciones aplicadas** desde cero con Prisma. Supabase producción continúa
  en **11/12** hasta desplegar primero la migración de cuentas gestionadas y después el runtime.
  No aplicar la migración manualmente fuera del ledger de Prisma.
- Advisors: seguridad solo informa RLS sin policies (denegación intencional); performance ya
  no reporta foreign keys sin índice. Los índices nuevos figuran sin uso por el tráfico mínimo.
- Pruebas: dominio 55/55, API 75/75 y web 3/3; lint, typecheck y builds API/Next completos,
  además de la migración y el seed desde cero en PostgreSQL local.
- Smoke local del flujo completo guardian-first: **117 PASS, 0 FAIL**; incluye cuenta
  gestionada, clave temporal, cambio obligatorio, asentimiento, recuperación indistinguible,
  diagnóstico, aprendizaje, voz, economía, seguridad, revisión humana y aislamiento.
- E2E Auth real: reset 201; cookie previa 401; contraseña anterior 401; nueva 201; replay del
  API 401; `PUT /auth/v1/user` directo 403 después del logout global.
- E2E familia real: 27 PASS, 0 FAIL con usuarios Admin temporales; invitación, HMAC,
  consentimiento, asentimiento, revocación, unlink, auditoría y outbox comprobados.
- Alta pública de apoderado: `/signup` respondió 200 y Auth registró
  `user_confirmation_requested` y `mail.send`, pero el remitente sigue siendo
  `noreply@mail.app.supabase.io`. Esto demuestra la solicitud, no la entrega al buzón. El
  flujo no se considera aprobado hasta configurar SMTP propio y verificar `delivered`.
- Producción todavía expone el runtime anterior: `GET /v1/health/version` devuelve 404 en vez
  de `guardian-first-v1`. Desplegar la API solo después de la migración y antes de la web.

## Gate automático de arranque

Con `NODE_ENV=production`, la API se niega a iniciar si:

- `DATABASE_URL` no es una URL PostgreSQL de producción.
- `SESSION_SECRET` conserva el valor de desarrollo o tiene menos de 32 caracteres.
- `WEB_ORIGIN` no es una URL HTTPS.
- falta cualquiera de las tres variables de Supabase Auth.
- `SUPABASE_URL` no usa HTTPS.
- `OUTBOX_DISPATCH_MODE` no es `webhook`, salvo mantenimiento explícito.
- `OUTBOX_WEBHOOK_URL` no es HTTPS o `OUTBOX_WEBHOOK_SECRET` tiene menos de 32 caracteres.

`ENABLE_DEV_LOGIN` es un opt-in independiente: solo el valor exacto `true` lo habilita
fuera de produccion. En produccion siempre permanece deshabilitado, incluso si la variable
esta presente. En CI se configura de forma expresa para el smoke test.

Producción exige `OUTBOX_DISPATCH_MODE=webhook`, `OUTBOX_WEBHOOK_URL` HTTPS y un
`OUTBOX_WEBHOOK_SECRET` aleatorio de 32+ caracteres. Por cada evento se envía un POST JSON
con `eventId`, tipo, agregado, versión, fecha y el payload contractual (sin PII ni texto libre).
Se firman los bytes exactos de `${timestamp}.${eventId}.${body}` con HMAC-SHA-256. El receptor
debe verificar `X-Outbox-Timestamp`, `X-Outbox-Event-Id` y `X-Outbox-Signature`, rechazar
timestamps vencidos y deduplicar por `eventId`: la entrega es al-menos-una-vez.

Solo una respuesta 2xx marca `publishedAt`, y las redirecciones HTTP se rechazan para no reenviar
el cuerpo ni las firmas HMAC a otro origen. Los workers reclaman lotes de forma atómica con
`FOR UPDATE SKIP LOCKED`, un `leaseOwner` único y un lease de 90 s; todas las confirmaciones se
condicionan al dueño del lease. Así varias réplicas pueden procesar la cola sin duplicar cada
evento, conservando la semántica al-menos-una-vez ante una caída en el instante de confirmación.

Fallos de red, timeout (10 s), HTTP 408, 429 y 5xx incrementan `attempts` y guardan
`nextAttemptAt` con backoff exponencial durable de 4 s hasta 5 min. Otros 4xx pasan directamente
a dead-letter; los fallos reintentables hacen lo mismo al octavo intento. Un evento en backoff o
dead-letter no bloquea eventos posteriores. No se registran cuerpos, secretos, URL ni mensajes
remotos en los logs. `local-log` queda restringido a entornos no productivos. `preserve` también
es no productivo salvo `OUTBOX_MAINTENANCE_MODE=true`: ese modo deja `publishedAt = null` y
readiness en 503 para que una instancia de mantenimiento no reciba tráfico accidentalmente.

Readiness consulta el estado durable en la base de datos e informa `outbox: local-log`,
`webhook-ready`, `webhook-retrying`, `webhook-dead-letter` o `pending-preserved`.
`webhook-retrying` sigue listo para tráfico; `webhook-dead-letter` y `pending-preserved`
devuelven 503. Después de corregir la causa, Operaciones debe reencolar explícitamente el evento
afectado limpiando `deadLetteredAt`, `leaseOwner`, `leaseUntil` y `lastErrorCode`, reiniciando
`attempts` y fijando `nextAttemptAt = clock_timestamp()`; la siguiente consulta de readiness se
recupera sin reiniciar el proceso.

Readiness para Railway: `GET /v1/health/ready`. Liveness: `GET /v1/health/live`.

## Gate de datos y Supabase

- Aplicar todas las migraciones antes de desplegar el nuevo runtime.
- Mantener `identity.auth_sessions` e `identity.staff_grants` fuera del Data API.
- Como la web nunca consulta tablas con `supabase-js`, desactivar Data API/GraphQL
  para estos esquemas o, como mínimo, conservar RLS sin policies y sin grants a
  `anon`/`authenticated`.
- Usar el pooler de Supabase para el runtime y una conexión administrativa controlada
  para migraciones.
- Rotar contraseña de BD, secret key y cualquier token que haya aparecido en chats.

## Gate operativo que el código no puede resolver

- El rate limiting incluido en la API es local y se reinicia con cada proceso. Antes
  de escalar a varias réplicas se requiere una capa distribuida en el edge/gateway
  (o un almacén compartido) para login, registro, recuperación/reset y códigos familiares.
- El alta pública de menores está cerrada. El apoderado confirma primero su correo y crea
  después una cuenta gestionada con usuario y clave temporal; el email técnico del alumno
  existe solo dentro del adaptador de Auth y nunca se guarda como contacto local.
- El alta de apoderados usa `/auth/v1/signup` y exige que **Confirm Email** permanezca
  habilitado (`mailer_autoconfirm=false`); el runtime rechaza el alta si Supabase devuelve
  una sesión ya confirmada.
- Agregar a la allow list de Redirect URLs de Supabase las rutas exactas
  `/es-PE/reset-password` y `/es-PE/login?verified=1` bajo `WEB_ORIGIN`.
- Fijar **Site URL** al origen público exacto de la web. En el despliegue actual es
  `https://plataforma-en-ingles.vercel.app`; añadir también el dominio propio cuando exista.
- Configurar SMTP de producción con dominio remitente verificado: host, puerto, usuario,
  contraseña, `From` y nombre del remitente. Publicar SPF, DKIM y DMARC, desactivar click
  tracking y ajustar el límite de emails de Auth después de una prueba controlada.
  Confirmación y recuperación no deben depender de `noreply@mail.app.supabase.io`: el SMTP
  integrado solo entrega a direcciones preautorizadas del equipo, tiene límites reducidos y
  el E2E real ya observó `over_email_send_rate_limit`.
- Conservar `ConfirmationURL`/`RedirectTo` en las plantillas y probar confirmación y recovery
  de extremo a extremo. **Send Email Hook** es una alternativa al SMTP, no un complemento:
  si se habilita debe encargarse de todos los correos Auth y del filtrado de destinatarios
  técnicos `@learners.invalid`.
- La readiness actual comprueba DB/outbox, no la entrega SMTP. Operaciones debe vigilar
  `user_confirmation_requested`, `mail.send`, rebotes y quejas en el proveedor de correo.
- Desplegar `supabase/functions/outbox-receiver`, configurar el mismo
  `OUTBOX_WEBHOOK_SECRET` en Supabase y Railway, y apuntar
  `OUTBOX_WEBHOOK_URL` a `/functions/v1/outbox-receiver`. El receptor verifica HMAC y
  timestamp, deduplica por `eventId` y conserva el recibo durable en
  `audit.outbox_webhook_receipts`. Sin receptor y secreto, el runtime de producción se niega
  a arrancar (o queda en mantenimiento con readiness 503).
- ZDR aprobado y verificado antes de voz para 12–13.
- Proveedor/proceso A2 para verificar al apoderado.
- Responsable nominal y cobertura humana de safeguarding P0–P3.
- Revisión legal, evaluación de impacto y políticas de borrado/exportación.
- Proveedor de pagos, reembolsos y control comercial exclusivamente adulto.
- Currículo B1→B2 suficiente para el piloto y gold sets de Tutor, Writing, Speaking y safety.
- Presupuesto y alertas reales de OpenAI.

## Familia, consentimiento y asentimiento

- Las invitaciones duran 24 horas y la base conserva únicamente un HMAC-SHA256 contextualizado. El código se entrega una sola vez y rotarlo invalida toda invitación pendiente anterior.
- Durante expand/contract, `expiresAt` conserva un default de 24 horas para writers anteriores. Sus filas `codeHash IS NULL` quedan expiradas/no aceptables y deben regenerarse con la versión nueva tras el despliegue.
- Las versiones activas son autoridad del servidor. Aprendizaje juvenil exige vínculo, `service`, `storage` y asentimiento vigentes; voz añade `ai_voice` e `international_transfer`.
- Revocar `service` o `storage`, o quitar el último vínculo, revoca las sesiones STAR. Revocar voz o transferencia termina las sesiones de voz abiertas, y cada heartbeat vuelve a evaluar autorización.
- La verificación A2 sigue siendo un gate externo: este hardening no la declara completada ni la sustituye.

## Recuperación de contraseña

- El flujo directo `verify(type=recovery)` de la versión actual de Supabase emite
  `amr=[{method: "otp"}]`; PKCE puede emitir `recovery`. El API acepta únicamente una AMR
  exacta `otp` o `recovery`, nunca mezclada con password/magic-link/invite, y además valida
  `sub`, email, issuer, audience, role, `session_id`, expiración y antigüedad máxima de 15 min.
- Una AMR `otp` no distingue criptográficamente recovery de un login OTP ordinario. STAR no
  ofrece magic-link/email-OTP como método de login; si se habilita en el futuro, migrar recovery
  a PKCE o a una transacción opaca propia antes de aceptar ambos flujos simultáneamente.
- El hash del bearer se consume una vez en PostgreSQL. El reset avanza la barrera de
  credenciales y revoca sesiones STAR antes y después de la llamada externa para cerrar logins
  en vuelo. Tras cambiar la contraseña, logout global elimina la sesión Auth actual; el E2E
  comprobó que un segundo PUT directo a Supabase responde 403.
- Esta semántica depende de la versión de Supabase Auth. Repetir el E2E de recovery después de
  actualizar GoTrue o cambiar de flujo implícito a PKCE.

## Orden de despliegue

1. Hacer backup y rotar credenciales expuestas.
2. Aplicar migraciones con el runtime anterior aún disponible.
3. Verificar que el staff existente recibió grants operativos.
4. Desplegar API y configurar health check en `/v1/health/ready`.
5. Desplegar web y ejecutar `scripts/smoke.sh` contra el entorno objetivo.
6. Revocar grants amplios de staff y asignar capacidades por responsabilidad real.
