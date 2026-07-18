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
