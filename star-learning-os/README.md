# STAR Learning OS

Implementación del corte vertical de **StarbizAcademy** según la suite documental STAR v1
(Metodología v1.5 · Especificación v1.1 · Stack 12+ v1.0 · Arquitectura Multilingüe v1.0).

Monolito modular multi-programa: English Path hoy, Spanish Path mañana, sin segunda plataforma.

## Estructura

```
apps/
  api/          NestJS + Fastify — API /v1, Prisma, gates juveniles, outbox, auditoría
  web/          Next.js App Router — alumno, familia y staff (interfaz ES)
packages/
  domain/       Motores académicos puros con tests (dominio §12.2, repaso 1/3/7/14/30,
                política de voz juvenil, promoción, placement, scoring)
  contracts/    DTOs Zod del contrato /v1 + códigos de error + UUIDv7
scripts/
  devdb.mjs     PostgreSQL 17 local embebido (sin Docker)
```

## Arranque local (Windows/macOS/Linux)

Requisitos: Node ≥ 22 y pnpm ≥ 9. No se necesita Docker ni PostgreSQL instalado.

```bash
pnpm install          # dependencias (incluye binarios PostgreSQL de desarrollo)
pnpm db:up            # inicia PostgreSQL local en el puerto 55432
pnpm db:migrate       # aplica el esquema (9 esquemas lógicos, multi-programa)
pnpm db:seed          # English Path B1 + familia demo
pnpm dev:api          # API en http://localhost:4000/v1
pnpm dev:web          # Web en http://localhost:3000  (otra terminal)
```

Configuración opcional en `.env` (ver `.env.example`). Sin `OPENAI_API_KEY`, las misiones
de voz corren en **modo demo** (interlocutor guiado + síntesis de voz del navegador); con
clave, usan **OpenAI Realtime por WebRTC** con secreto efímero emitido por el servidor.

## Familia demo (login de desarrollo)

| Perfil | Quién es | Qué demuestra |
|---|---|---|
| Diego, 15 | Alumno 14–17 con todo autorizado | Diagnóstico → Hoy → lección → evidencia → dominio → voz |
| Lucía, 12 | Alumna 12–13 | La voz se **bloquea técnicamente** sin ZDR (`ZDR_VERIFIED=false`) |
| Ana Torres | Apoderada | Progreso, permisos y consumo — sin transcripciones, por diseño |
| Prof. Rivas | Staff | Cola de revisión humana (placement, writing) y casos de safety |

## Reglas de arquitectura que este código ya cumple

- La clave de OpenAI **nunca** llega al navegador: secreto efímero + adaptador de proveedor.
- Cero sesiones de voz 12–13 sin ZDR verificado; cero sin vínculo/consentimiento/asentimiento.
- Evidencia + dominio + outbox se escriben en **una transacción**.
- El cliente jamás recibe claves de respuesta (`answerKey` es solo servidor).
- Placement de menores queda **provisional** hasta decisión humana registrada.
- Progreso en 4 métricas separadas: cobertura, dominio, retención, readiness.
- Multi-programa desde el día 1: todo cuelga de `enrollment` + `program_version`.

## PWA y app nativa (Capacitor)

**PWA**: la web ya es instalable — manifest en `/manifest.webmanifest`, iconos SVG
(normal + maskable) y `display: standalone`. En Chrome/Edge: menú → "Instalar app".

**App nativa Android/iOS** (Capacitor 8, proyecto en `apps/web/android/`):

```bash
# 1. Apunta el shell nativo a tu servidor Next (ver .env.example):
#    Emulador Android: CAP_SERVER_URL=http://10.0.2.2:3000
#    Dispositivo real:  CAP_SERVER_URL=http://<IP-de-tu-PC>:3000
CAP_SERVER_URL=http://10.0.2.2:3000 pnpm --filter @star/web cap:sync
pnpm --filter @star/web cap:open:android   # abre Android Studio → Run
# iOS (requiere macOS): pnpm --filter @star/web cap:add:ios && cap:open:ios
```

En producción, `CAP_SERVER_URL` es la URL pública HTTPS desplegada; sin ella, la app
muestra el shell offline de `capacitor-shell/`.

## Verificación

```bash
pnpm build        # contracts → domain → api → web
pnpm test         # tests del dominio académico
pnpm lint
```

## Qué NO incluye todavía (ver ../tasks/todo.md)

Currículo B1→B2 completo (solo unidad muestra), StarMap 360 completo, backoffice de
autoría, sideband WebSocket endurecido, pagos (D25 pendiente), Terraform/CI, gold sets.
Los bloqueadores externos (ZDR, GCP, legal, salvaguarda) están listados en `tasks/todo.md`.
