# Lecciones aprendidas

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
