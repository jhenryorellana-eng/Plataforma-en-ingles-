# Convenciones del proyecto STAR Learning OS

Derivadas de Stack v1.0 y Arquitectura Multilingüe v1.0. Obligatorias para todo código nuevo.

## Lenguaje y estilo
- TypeScript estricto en todo (`strict: true`); prohibido `any`.
- Sin `console.log` en producción: usar el logger central con redacción (Stack §14.1).
- Sin números/strings mágicos: constantes en `packages/domain` o `packages/contracts`.
- Funciones ≤ 50 líneas; archivos ≤ 300 líneas cuando sea razonable.
- Comentarios solo para restricciones no evidentes; código autoexplicativo.

## Arquitectura
- Monolito modular: ningún módulo escribe en tablas de otro; solo servicios de dominio (Stack §6).
- Todo proveedor externo detrás de interfaz (`IdentityProvider`, `VoiceProvider`, `PaymentProvider`) con implementación real + mock (Arquitectura §6.1).
- Los módulos de dominio NO importan SDKs de OpenAI ni Google Cloud.
- Nombres de modelos de IA solo en configuración (`realtime_tutor_primary`), nunca en currículo ni código de dominio (ADR-M009).
- Toda consulta de aprendizaje empieza por `enrollment_id` y valida la cadena actor→vínculo→enrollment→program_version (Arquitectura §10.4).
- Evidencia + mastery + outbox se escriben en UNA transacción (Arquitectura §9.7).
- POST sensibles aceptan `Idempotency-Key`.

## Datos
- IDs expuestos: UUIDv7. Fechas: `timestamptz` UTC. Dinero: entero en unidad mínima + ISO moneda.
- Versión publicada = inmutable; modificar = nueva versión.
- Audio juvenil de práctica: NUNCA persistido por defecto (ADR-004/M008).
- Logs sin PII, sin tokens, sin transcripciones, sin respuestas de evaluación.

## Seguridad
- Clave estándar de OpenAI solo en servidor; navegador recibe secreto efímero.
- Cookies `HttpOnly` + `Secure` + `SameSite`.
- Autorización SIEMPRE en servidor por acción/objeto/relación/edad; el cliente no manda IDs confiables.
- Menores 12–13 sin ZDR verificado = 0 sesiones de voz (bloqueo técnico, no política).
- Decisión significativa juvenil = estado `provisional` hasta revisión humana.

## Proceso
- Conventional Commits. Cada PR: build + tests + lint verdes.
- Cambios de prompt/modelo/rúbrica requieren registro de versión (Metodología §15.2).
