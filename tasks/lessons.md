# Lecciones aprendidas

## 2026-07-15: Coherencia entre documentos hermanos
**Error**: La Especificación §10.2 asignaba `gpt-realtime-2.1-mini` a la conversación cotidiana mientras Metodología §18, Decisión D21 y Stack §8.4 exigían el modelo insignia primero.
**Root cause**: Los cuatro documentos evolucionaron en paralelo sin una pasada final de consistencia cruzada.
**Regla**: Todo cambio en un documento de la suite STAR obliga a verificar los otros cuatro (modelo, SLOs, horas, nombres) antes de darlo por cerrado.

## 2026-07-15: "Producción hoy" ≠ plataforma en producción
**Error**: Expectativa de pasar a producción el mismo día con solo documentación.
**Root cause**: "Producción" significaba cosas distintas: congelar documentos vs desplegar software.
**Regla**: Ante una meta ambiciosa de plazo, traducirla a los gates que los propios documentos definen y mostrar qué es posible hoy de forma honesta (corte vertical local → piloto → producción).
