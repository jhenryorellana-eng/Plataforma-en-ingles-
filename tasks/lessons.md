# Lecciones aprendidas

## 2026-07-15: Identidad visual de StarbizAcademy (dos iteraciones rechazadas)
**Error**: v1 "cósmica oscura con emojis" → rechazada (lee como app de juego). v2 "editorial académica clara con serif" → rechazada ("parece notarial, muy formal").
**Root cause**: Ninguno de los dos extremos era lo que Henry quiere: el producto debe leerse como una **app tecnológica premium y única** (referentes: Linear, Vercel, Raycast), coherente con el nombre "STAR Learning OS".
**Regla (v3 rechazada también — el problema era LA ESTRUCTURA, no la paleta)**: v3 dark-tech tampoco convenció; Henry pidió "como si Apple creara esta app". La v4 definitiva sigue Apple HIG: fondo agrupado #F2F2F7, tarjetas blancas SIN borde, títulos grandes extrabold con saludo ("Hola, Diego"), listas agrupadas con teselas de icono de color y chevrons (estilo Ajustes), tarjeta héroe llena de color (estilo App Store Today), ANILLOS de actividad para las 4 métricas (estilo Fitness), pantalla de voz como LLAMADA (estilo FaceTime: avatar, cronómetro grande, botones circulares con etiqueta, colgar en rojo), tab bar iOS traslúcida, UNA sola tipografía (Onest) donde el peso hace la jerarquía, paleta de sistema iOS (#5E5CE6 índigo, #0A84FF azul, #30B0C7 teal, #34C759 verde, #FF9F0A ámbar, #FF3B30 rojo). Regla operativa: ante feedback de diseño, preguntar/confirmar el REFERENTE (una app concreta) antes de iterar la estética.

## 2026-07-15: Variables de next/font con Tailwind v4
**Error**: Los títulos no renderizaban Fraunces; la utilidad `font-display` resolvía al stack por defecto.
**Root cause**: next/font define sus variables en `<body>`, pero `@theme` normal de Tailwind v4 resuelve `var(--font-fraunces)` en `:root`, donde no existe → valor inválido.
**Regla**: Los tokens de fuente que referencian variables de next/font van SIEMPRE en `@theme inline`.

## 2026-07-15: script-shell global rompe pnpm en esta máquina
**Error**: `pnpm install` y todos los scripts de paquetes se colgaban indefinidamente o abrían cmd interactivo (banner de Windows en la salida).
**Root cause**: `~/.npmrc` global contiene `script-shell=C:\Windows\system32\cmd.exe`; pnpm invoca la shell configurada con sintaxis POSIX (`-c`), cmd la ignora y queda esperando stdin para siempre. GNU `timeout` sobre shims `.cmd` produce el mismo síntoma.
**Regla**: En esta máquina, todo repo con pnpm necesita `.npmrc` local con `script-shell=C:/Program Files/Git/usr/bin/bash.exe` (ya está en star-learning-os). Instalar con `--ignore-scripts` y ejecutar los generate/postinstall necesarios explícitamente. Nunca envolver shims .cmd con GNU timeout; usar el timeout del tool.

## 2026-07-15: Coherencia entre documentos hermanos
**Error**: La Especificación §10.2 asignaba `gpt-realtime-2.1-mini` a la conversación cotidiana mientras Metodología §18, Decisión D21 y Stack §8.4 exigían el modelo insignia primero.
**Root cause**: Los cuatro documentos evolucionaron en paralelo sin una pasada final de consistencia cruzada.
**Regla**: Todo cambio en un documento de la suite STAR obliga a verificar los otros cuatro (modelo, SLOs, horas, nombres) antes de darlo por cerrado.

## 2026-07-15: "Producción hoy" ≠ plataforma en producción
**Error**: Expectativa de pasar a producción el mismo día con solo documentación.
**Root cause**: "Producción" significaba cosas distintas: congelar documentos vs desplegar software.
**Regla**: Ante una meta ambiciosa de plazo, traducirla a los gates que los propios documentos definen y mostrar qué es posible hoy de forma honesta (corte vertical local → piloto → producción).

## 2026-07-17: Rediseño responsive total (mobile → desktop + dark mode)
**Contexto**: Auditoría UX/UI pedida por Henry ("que parezca una app de 1M$ en mobile, tablet y desktop"). Se mantuvo intacto el lenguaje v4 (Apple HIG) y se corrigió LA ESTRUCTURA: `LearnShell` (rail lateral ≥lg, dock solo <lg, nada en `/lesson/` — `components/nav.tsx`), `PublicShell` (split-screen de marca ≥lg en login/register/preview/enroll/onboarding — `components/public-shell.tsx`), grids ≥lg en Hoy/Progreso/Familia/Staff, player de lección con CTA fijo (`CtaBar` en `activity-form.tsx`), `EmptyState` compartido, consola staff sin JSON crudo, dark mode por intercambio de tokens en `globals.css` (sin `dark:` en componentes) y `color-scheme` nativo.
**Trampa encontrada**: `position:fixed` dentro de un contenedor con animación que retiene `transform` (`.rise` con fill `both`) se posiciona respecto a ese contenedor, no al viewport — la barra CTA del player quedaba "pegada" en flujo. Regla: animaciones de entrada con fill **`backwards`** (estado final = estilos naturales, sin transform residual).
**Regla de build**: `NEXT_PUBLIC_*` se inyecta en BUILD time en Next; cambiar `NEXT_PUBLIC_API_URL` exige rebuild (no basta pasarlo al `next start`).

## 2026-07-17: Fix verificado solo en código, no en el runtime del usuario
**Error**: Apliqué un fix en el fuente y asumí que el usuario lo probaba; sus servidores eran `next start` con un build viejo, así que el fix nunca corrió.
**Root cause**: No verifiqué QUÉ proceso servía la app (dev vs build de producción) ni QUÉ API usaba el bundle (`NEXT_PUBLIC_API_URL` se inyecta en build time; la instancia 4000 no tiene datos demo, la 4001 sí).
**Rule**: Antes de decir "prueba de nuevo", confirmar el runtime real: `Get-CimInstance Win32_Process` para ver si es `next dev` o `next start`, y reproducir el flujo E2E con el arnés Playwright de `.shots/tool/` (login dev en API 4001) en vez de pedirle capturas al usuario.

## 2026-07-18: `pnpm dev:api` (tsx) roto con Node 25 — DI de Nest muerta en silencio
**Error**: La API en dev arrancaba y "escuchaba", pero TODO respondía 500 (`getAllAndOverride` de Reflector undefined) y el outbox fallaba cada 2 s (`this.prisma` undefined).
**Root cause**: Node 25 hace type-stripping nativo de TS con semántica TC39 de decoradores: tsx 4.23 no llega a transformar y `emitDecoratorMetadata` nunca se aplica → `design:paramtypes` = undefined → Nest instancia TODOS los providers/guards sin argumentos, sin error de arranque. Verificado: falla hasta con tsconfig inline y clase mínima; el build tsc (`tsconfig.build.json`) sí emite metadata.
**Rule**: En esta máquina la API local se corre COMPILADA: `pnpm build` + `node apps/api/dist/main.js` (el smoke 60/60 se validó así). Pin de runtime: Node 22 LTS (`.nvmrc`/engines) si se quiere `tsx watch` de vuelta; no asumir que "arrancó = funciona": siempre pegarle a una ruta real. Ojo: `tsx watch`/`pnpm dev` dejan hijos huérfanos que retienen el puerto al matar al padre (verificar con netstat antes de reintentar).

## 2026-07-19: "No pudimos conectar con el servidor" puede ser CORS, no el servidor caído
**Error**: El usuario abrió la web local (3001) y el login fallaba con el mensaje de red de la app; la API estaba viva y respondía.
**Root cause**: `WEB_ORIGIN` de la API era `http://localhost:3000` (default) pero la web servía en 3001 → TODAS las llamadas client-side (login demo, iniciar lección, voz) morían por CORS. Las Server Components seguían funcionando (llamadas server-side sin CORS), así que la app "cargaba pero no conectaba".
**Rule**: Al levantar el stack local en puertos no estándar, SIEMPRE exportar `WEB_ORIGIN` con el origen real de la web. Y el E2E de verificación (`.shots/tool/verify-pack.cjs`) debe incluir al menos una acción client-side (no solo páginas SSR), porque las SSR no ejercitan CORS.

## 2026-07-24: "En producción" ≠ "en la rama" — y un CI que nunca corrió no protege
**Error**: La web en Vercel mostraba la demo de voz pero la API en Railway respondía 404 ("Cannot POST /v1/voice-demo/call"): el commit estaba en la rama `agent/...`, no en `main`, y Railway despliega desde `main`. Primera hipótesis (API key) era incorrecta.
**Root cause doble**: (1) push a rama se asumió como "ya está en producción"; (2) el CI que habría detectado el desfase NUNCA había pasado — 5/5 fallos desde su creación (pnpm 10 bloquea postinstalls → `db:seed` moría sin cliente Prisma generado) y nadie miró el resultado.
**Reglas**: (a) "En producción" = "está en `main`" y se verifica leyendo `x-star-build-sha` del servidor (la API lo expone en cada respuesta) — un 404 de ruta jamás es problema de claves: las claves ausentes dan 503 con la ruta viva. (b) Todo workflow de CI nuevo se valida viendo su PRIMERA ejecución en verde; un gate rojo permanente es peor que no tener gate porque da sensación de cobertura. (c) Los errores de contrato web↔API se degradan con mensaje humano en el cliente (404/405 → "no disponible"), y el smoke verifica que las rutas públicas nuevas existan en el mismo commit.

## 2026-07-28: Elegir una opción en abstracto ≠ aprobar el resultado visual
**Error**: Henry marcó "Apple claro" entre mockups ASCII para el panel del apoderado; implementado y desplegado, lo rechazó: quería los colores, la atmósfera y la imagen de siempre — "mejorar" significaba REORGANIZAR el contenido, no cambiar el lenguaje visual.
**Root cause**: Una pregunta de opción múltiple con previews de texto no transmite el apego a la identidad visual existente; "no me gusta cómo se ve" apuntaba a jerarquía/orden, y la opción recomendada lo ancló hacia un rediseño total.
**Regla**: Ante feedback de diseño sobre una vista existente, la primera iteración SIEMPRE conserva el lenguaje visual (tokens, atmósfera, ilustraciones) y solo mueve estructura/jerarquía; un cambio de lenguaje visual se enseña en el dev server y se aprueba VIÉNDOLO antes de desplegarlo. Complementa la lección 2026-07-15 del referente.

## 2026-07-29: El stack local heredó el Supabase de PRODUCCIÓN desde .env
**Error**: Las demos locales de cuentas gestionadas (luna/rocio/mati.demo) crearon usuarios reales en auth.users de producción: la API local corría con DATABASE_URL local pero config.ts carga el .env de la raíz, que apunta SUPABASE_URL/keys al proyecto real.
**Root cause**: El override de entorno al lanzar la API local solo cubrió DATABASE_URL/WEB_ORIGIN; el proveedor de identidad siguió siendo SupabaseIdentityProvider contra producción.
**Regla**: Para el stack local SIEMPRE vaciar las tres variables de Supabase (`SUPABASE_URL= SUPABASE_PUBLISHABLE_KEY= SUPABASE_SECRET_KEY=`) en el comando de arranque para forzar MockIdentityProvider, o usar un .env.local dedicado. Verificable: el login demo funciona y ningún registro aparece en auth.users remoto.
