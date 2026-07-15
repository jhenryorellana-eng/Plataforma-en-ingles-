# Stack Tecnológico STAR Learning OS 12+

**Empresa:** StarbizAcademy  
**Versión:** 1.0  
**Fecha:** 14 de julio de 2026  
**Estado:** arquitectura recomendada para estimación, prototipo y construcción  
**Documentos relacionados:** Metodología STAR Mastery v1.5 y Especificación de Producto y Plataforma STAR v1.1  
**Extensión multi-programa:** [Arquitectura Multilingüe STAR Learning OS v1.0](Arquitectura_Multilenguaje_STAR_v1.md), que incorpora English Path y Spanish Path sin reemplazar este stack.

---

## 0. Decisión ejecutiva

STAR Learning OS se construirá como una plataforma web/PWA para estudiantes desde los 12 años, con tres experiencias relacionadas pero distintas:

- **Youth 12–13:** cuenta dependiente de un apoderado, consentimiento verificable, privacidad máxima y acceso a OpenAI únicamente cuando Starbiz tenga Zero Data Retention aprobado.
- **Teen 14–17:** cuenta juvenil vinculada a un apoderado, consentimiento y avisos comprensibles para el adolescente, más coautorización del adulto como política interna de Starbiz.
- **Adult 18+:** cuenta autónoma y transición controlada al cumplir la mayoría de edad.

La enseñanza cotidiana puede seguir siendo impartida por el Mentor IA. Sin embargo, el producto no se definirá como “100% sin humanos”: evaluación de alta consecuencia, apelaciones, privacidad, protección infantil y gobierno académico requieren personas responsables detrás del sistema.

> **Definición correcta:** 100% de la enseñanza visible puede ser dirigida por IA; 100% de las decisiones, la seguridad y la responsabilidad no.

La arquitectura elegida es un **monolito modular en TypeScript**, desplegado en Google Cloud, con un frontend Next.js, API NestJS/Fastify, PostgreSQL administrado, procesos asíncronos, OpenAI Realtime por WebRTC y controles server-side. Esta elección prioriza velocidad de construcción, trazabilidad y capacidad de separar servicios después, sin pagar la complejidad prematura de microservicios.

### Resultado de la decisión

| Área | Elección recomendada |
|---|---|
| Producto inicial | Web adaptable y PWA; no app nativa |
| Público | 12–17 como producto juvenil; flujo 18+ separado |
| Cloud | Google Cloud Platform |
| Frontend | Next.js + React + TypeScript |
| Backend | NestJS con adaptador Fastify |
| Base de datos | Cloud SQL para PostgreSQL |
| Archivos | Cloud Storage con borrado por ciclo de vida |
| Asíncrono | Cloud Tasks; Pub/Sub cuando exista fan-out real |
| Identidad | Identity Platform + modelo propio de familia y permisos |
| Voz | OpenAI Realtime + Agents SDK + WebRTC |
| Evaluación final | Pipeline controlado + revisión pedagógica humana |
| Infraestructura como código | Terraform |
| Observabilidad | OpenTelemetry + Cloud Logging, Monitoring y Trace |
| Analítica | Eventos seudónimos; BigQuery después del piloto |

No se fijan versiones “latest” dentro del contrato. Cada versión se inmoviliza en el lockfile y se actualiza mediante pruebas de regresión. Al comenzar el desarrollo se seleccionará la versión estable con soporte de seguridad vigente; PostgreSQL 17 es la base conservadora inicial salvo validación de una versión posterior compatible.

---

## 1. Condiciones que bloquean el lanzamiento

Estas condiciones son parte del stack. No son tareas legales externas que puedan agregarse después.

### 1.1 Tramo 12–13 y OpenAI

La guía oficial de OpenAI para experiencias dirigidas a menores indica que no se deben procesar datos personales de niños menores de 13 años, o por debajo de la edad digital aplicable, sin haber implementado Zero Data Retention. En Perú, el consentimiento digital para menores de 14 años corresponde a quien ejerce patria potestad o tutela.

Por tanto:

1. Starbiz solicitará y obtendrá aprobación de **Zero Data Retention — ZDR**.
2. Producción de menores usará un proyecto aislado, por ejemplo `starbiz-minors-prod`.
3. Se comprobará ZDR con una prueba y evidencia de configuración antes de admitir alumnos de 12–13.
4. Si ZDR no está aprobado, el sistema bloqueará ese tramo. Una política o una casilla de consentimiento no reemplaza ZDR.
5. `/v1/realtime`, `/v1/moderations` y audio transcription son elegibles para ZDR según los controles de datos publicados; no se usarán endpoints persistentes no elegibles para alojar el estado pedagógico.

Fuentes: [Under 18 API Guidance](https://developers.openai.com/api/docs/guides/safety-checks/under-18-api-guidance) y [Data controls](https://developers.openai.com/api/docs/guides/your-data#data-retention-controls-for-abuse-monitoring).

### 1.2 Consentimiento y verificación

- Menores de 14: consentimiento verificable del apoderado y asentimiento del joven.
- De 14 a 17: consentimiento juvenil comprensible y, como política Starbiz, coautorización del apoderado para servicio, pago, voz y decisiones académicas.
- Se realizarán esfuerzos razonables para verificar edad e identidad de quien consiente.
- Consentimientos de servicio, voz, evaluación/perfilado, transferencia internacional, marketing e investigación estarán separados.
- El menor nunca será la fuente para preguntar profesión, ingresos u otros datos familiares que no correspondan.

Fuente: [Reglamento de la Ley peruana de Protección de Datos Personales, D.S. 016-2024-JUS](https://epdoc2.elperuano.pe/EpPo/VistaNLSE.asp?Referencias=MjM0OTY1My0xMjAyNDExMzA%3D), artículos 22–25.

### 1.3 Evaluación educativa de menores

El D.S. 115-2025-PCM considera de alto riesgo ciertos usos de IA para evaluar a niñas, niños y adolescentes en educación, salvo que sean complementarios y no reemplacen la evaluación pedagógica humana. El sector privado debe disponer de supervisión humana capaz de detener, corregir o invalidar decisiones significativas.

En STAR:

- Práctica, feedback y recomendaciones diarias pueden ser automáticas.
- Placement definitivo, promoción de etapa, invalidación por integridad, readiness y certificado de un menor pasan por una cola de revisión humana.
- La aprobación no será un sello automático. El revisor verá evidencia, rúbrica, confianza y versión de los componentes.
- El alumno y su apoderado podrán solicitar revisión.

Fuente: [Reglamento peruano de IA, D.S. 115-2025-PCM](https://www3.congreso.gob.pe/Docs/DGP/DIDP/files/ds_115-2025-pcm.pdf), artículos 24, 25 y 31.

### 1.4 Protección infantil operativa

Antes de ofrecer voz 24/7 debe existir cobertura real de escalamiento. Si no existe, el MVP limitará el horario de sesiones de voz. Debe haber un responsable humano de salvaguarda, protocolo, turnos, SLA y simulacros.

---

## 2. Principios de arquitectura

1. **Privacidad alta por defecto.** Audio crudo, transcripciones completas, ubicación, cámara y datos sensibles no se guardan por conveniencia.
2. **Estado propio.** El currículo, progreso, memoria pedagógica y expedientes viven en Starbiz, no en conversaciones persistentes del proveedor de IA.
3. **IA sin autoridad directa.** El modelo propone; servicios deterministas autorizan, puntúan, registran y promueven.
4. **Una identidad visible, varios motores internos.** El alumno habla con Mentor STAR; internamente existen Tutor, Examiner, Safety Gateway y servicios académicos separados.
5. **Separación por edad.** La banda etaria cambia permisos, lenguaje, contenido y flujo de consentimiento; no solo el tema visual.
6. **Sin clave en cliente.** Las claves estándar de OpenAI y cloud nunca llegan al navegador.
7. **Menor exposición posible.** El navegador habla directamente con OpenAI por WebRTC usando una sesión autorizada y controlada; el servidor mantiene un canal sideband.
8. **Sin open web para el Mentor.** El contenido proviene de un repositorio aprobado y versionado.
9. **Monolito modular primero.** Separar despliegues solo cuando exista una razón medible de escala, seguridad o equipo.
10. **Eventos auditables.** Consentimiento, evidencia, score, revisión, acceso sensible y cambio de configuración generan registros inmutables.
11. **Costos por alumno.** Cada sesión registra consumo por modalidad, plan, actividad, modelo y versión.
12. **Reemplazo de proveedor.** El dominio no depende de nombres o formatos internos de un modelo.

---

## 3. Arquitectura de alto nivel

~~~mermaid
flowchart TB
    subgraph Clientela["Experiencias"]
      Y["Web/PWA juvenil"]
      F["Portal de apoderado"]
      A["Backoffice académico y safety"]
    end

    EDGE["Load Balancer · CDN · WAF"]
    API["API STAR · NestJS/Fastify"]
    VOICE["Voice Session Service"]
    SAFETY["Safety Gateway"]
    CORE["Núcleo académico\nGraph · Content · Evidence · Mastery · Assess · Proof"]
    REVIEW["Cola de revisión humana"]
    TASKS["Cloud Tasks / workers"]
    DB[("Cloud SQL PostgreSQL")]
    OBJ[("Cloud Storage")]
    ID["Identity Platform"]
    OAI["OpenAI Realtime y APIs ZDR"]
    OBS["OpenTelemetry · Logging · Monitoring · Trace"]

    Y --> EDGE
    F --> EDGE
    A --> EDGE
    EDGE --> API
    API --> ID
    API --> CORE
    API --> VOICE
    VOICE --> OAI
    VOICE <--> SAFETY
    SAFETY --> OAI
    SAFETY --> REVIEW
    CORE --> REVIEW
    CORE --> TASKS
    CORE --> DB
    API --> OBJ
    TASKS --> DB
    API --> OBS
    VOICE --> OBS
    SAFETY --> OBS
~~~

### 3.1 Topología de despliegue

| Componente | Despliegue MVP | Motivo |
|---|---|---|
| `web` | Cloud Run detrás de Load Balancer y CDN | SSR/PWA, control de región y un solo cloud |
| `api` | Cloud Run, mínimo 1 instancia en producción | API transaccional y emisión de sesiones |
| `voice-control` | Cloud Run con timeout de WebSocket adecuado | Sideband, tools, kill switch y observación |
| `worker` | Cloud Run service/Jobs llamado por Cloud Tasks | Scoring, reportes, borrado y notificaciones |
| PostgreSQL | Cloud SQL privado con PITR | Datos operativos, evidencia y auditoría |
| Objetos | Buckets separados | Audio opcional, Writing, exportaciones y archivos |
| Identidad | Identity Platform | Credenciales, MFA, custom tokens y revocación |
| Secretos | Secret Manager + Cloud KMS | Claves fuera del código y rotación |
| Artefactos | Artifact Registry | Imágenes de despliegue firmadas/versionadas |

Se usará una región de Sudamérica disponible para los componentes operativos después de una prueba de latencia, costo y requisitos de transferencia. La ubicación exacta es una decisión de arquitectura y privacidad que debe quedar registrada; no se asume que ubicar infraestructura en Sudamérica evita el flujo internacional hacia OpenAI.

---

## 4. Stack concreto

### 4.1 Repositorio y lenguaje

| Capa | Tecnología |
|---|---|
| Lenguaje principal | TypeScript con modo estricto |
| Runtime | Node.js LTS fijado por `.nvmrc`/Volta y CI |
| Monorepo | pnpm workspaces + Turborepo |
| Convenciones | ESLint + Prettier + EditorConfig |
| Commits/releases | Conventional Commits + Changesets cuando haya paquetes publicados |
| Contratos | OpenAPI 3.1 + JSON Schema |
| Validación | Zod en límites de entrada/salida |

Estructura recomendada:

~~~text
apps/
  web/                 # alumno, apoderado y shell de backoffice
  api/                 # monolito modular
  voice-control/       # sesiones Realtime y sideband
  worker/              # trabajos asíncronos
packages/
  ui/                  # sistema de diseño accesible
  contracts/           # DTO, eventos y esquemas
  authz/               # políticas de autorización
  curriculum-schema/   # contratos de contenido
  ai-gateway/          # abstracción de modelos
  observability/       # logs, métricas y trazas
  test-fixtures/       # casos sintéticos sin PII
infra/
  terraform/
docs/
  adr/
  runbooks/
  policies/
~~~

### 4.2 Frontend

| Necesidad | Elección |
|---|---|
| Framework | Next.js App Router |
| UI | React + Tailwind CSS + componentes basados en Radix/shadcn revisados |
| Formularios | React Hook Form + Zod |
| Estado remoto | TanStack Query solo donde el servidor no resuelva el flujo |
| Estado local complejo | Zustand en voz/evaluación; evitar store global innecesario |
| PWA | Manifest, service worker limitado y estrategia offline explícita |
| Internacionalización | next-intl; interfaz ES e inmersión EN gradual |
| Accesibilidad | WCAG 2.2 AA; axe-core en pruebas |
| Voz | WebRTC nativo encapsulado en `VoiceSessionClient` |
| Gráficos | SVG/HTML accesible; no depender del color |

Reglas para jóvenes:

- Variantes UX `youth_12_14` y `teen_15_17`, modernas y no infantilizadas.
- Botones permanentes **Pausar**, **Salir**, **Reportar** y **Silenciar micrófono**.
- Nada de compras o upselling dentro de la experiencia del alumno.
- Sin rachas que castiguen, temporizadores manipulativos, rankings públicos ni presión para compartir datos.
- Sin chat privado entre alumnos, perfiles públicos, cámara o comunidad abierta en el MVP.
- Logout visible para dispositivos compartidos; sesión juvenil más corta y reautenticación para acciones sensibles.
- Subtítulos, reducción de movimiento, tamaño de texto, teclado, lector de pantalla y modo de baja conectividad.

### 4.3 Backend

| Necesidad | Elección |
|---|---|
| Framework | NestJS |
| Servidor HTTP | Fastify adapter |
| API | REST JSON con OpenAPI; WebSocket solo donde corresponda |
| ORM | Prisma para esquema, migraciones y acceso tipado; SQL explícito para reportes/RLS |
| Jobs | Cloud Tasks con handlers idempotentes |
| Eventos de integración | Pub/Sub al existir más de un consumidor real |
| Cache | Memorystore Redis después de medir necesidad |
| Plantillas | React Email o equivalente; proveedor transaccional por adaptador |
| Documentos | Servicio propio para certificados/reportes PDF |

No se usarán Server Actions como frontera principal del dominio. El frontend puede utilizarlas para composición segura, pero las reglas de negocio permanecen en la API modular y pueden ser consumidas por PWA, backoffice o una futura app.

### 4.4 Datos y almacenamiento

| Tipo | Tecnología/política |
|---|---|
| Operacional | Cloud SQL PostgreSQL |
| Archivos | Cloud Storage con URL firmada de corta duración |
| Búsqueda curricular | PostgreSQL full-text al inicio |
| Vectores | `pgvector` solo si una prueba demuestra necesidad; nunca como fuente de verdad |
| Analítica | Tabla de eventos seudónimos; exportación a BigQuery en fase de escala |
| Backups | Cloud SQL PITR + backup verificado; restauración ensayada |
| Auditoría | Append-only lógico, hash de integridad y exportación protegida |

El navegador no tendrá acceso directo general a PostgreSQL ni a buckets. Toda autorización pasa por la API; URLs firmadas tendrán objeto, acción y vencimiento limitados.

---

## 5. Identidad, familia y control de edad

### 5.1 Identidades separadas

No habrá una cuenta compartida entre adulto y alumno.

| Identidad | Autenticación | Facultades principales |
|---|---|---|
| Apoderado | Email verificado; MFA para acciones sensibles | Consentir, pagar, configurar carga, gestionar derechos y ver resumen |
| Alumno 12–13 | Perfil dependiente, dispositivo autorizado y token custom | Aprender, hablar, ver progreso, reportar y pedir revisión |
| Alumno 14–17 | Cuenta juvenil propia o perfil dependiente, siempre vinculada | Lo anterior más consentimiento juvenil y autonomía no comercial |
| Adulto 18+ | Cuenta autónoma | Cuenta, privacidad, pagos y aprendizaje |
| Personal | OIDC corporativo con MFA | Acceso según rol y necesidad |

### 5.2 Flujo 12–13

1. El joven ve información sin enviar voz ni PII, o el adulto inicia directamente.
2. Se recoge solo un contacto mínimo para invitar al apoderado.
3. El adulto crea su cuenta, verifica email e identidad/autoridad por un proveedor configurado.
4. El backend guarda el resultado de verificación, no una copia permanente del documento salvo necesidad legal demostrada.
5. El adulto acepta finalidades separadas y configura el perfil juvenil.
6. El joven recibe un aviso corto, responde preguntas de comprensión y asiente.
7. El dispositivo se vincula y el backend emite un custom token de Identity Platform para ese learner.
8. La API comprueba en cada sesión: vínculo activo, consentimientos vigentes, asentimiento, banda de edad y `zdr_ready=true`.

### 5.3 Flujo 14–17

El joven puede iniciar el registro y usar su email, pero el enrollment no se activa hasta que el apoderado acepte términos comerciales y permisos de Starbiz. La privacidad juvenil se explica al alumno directamente; el apoderado no obtiene acceso silencioso a conversaciones completas.

### 5.4 Age assurance

El servicio `AgeAssurance` tendrá una interfaz de proveedor y niveles:

- **A0:** edad declarada; sirve solo para navegación informativa.
- **A1:** email/teléfono del adulto y vínculo confirmado; no basta para 12–13 en producción.
- **A2:** verificación razonable del apoderado mediante proveedor o método aprobado; habilita enrollment.
- **A3:** revisión manual por conflicto, fraude o custodia.

Nunca se pedirá al Mentor IA inferir edad desde la voz, imagen, vocabulario o comportamiento.

### 5.5 Consentimiento como dato versionado

Cada `consent_grant` debe contener como mínimo:

- sujeto al que corresponden los datos;
- persona que lo otorga y autoridad/vínculo;
- banda de edad;
- finalidad específica;
- versión del aviso y términos;
- proveedores/destinatarios informados;
- transferencia internacional;
- obligatoriedad u opcionalidad;
- fecha, canal, evidencia de verificación y vencimiento;
- estado, revocación y efecto operativo.

Una revocación de voz impide crear nuevas sesiones. Una revocación del servicio inicia el flujo de cierre y conservación justificada; nunca se limita a cambiar un booleano.

---

## 6. Módulos del monolito

| Módulo | Responsabilidad | Datos sensibles destacados |
|---|---|---|
| Identity & Access | sesiones, roles, MFA, dispositivos y authz | identificadores y accesos |
| Family | apoderados, learners, vínculos y alcance | relación familiar |
| Consent & Privacy | consentimientos, solicitudes y retención | evidencia legal |
| Enrollment | activación, nivel, plan y estado | trayectoria |
| Curriculum | grafo, contenido, versiones y aprobación | propiedad académica |
| Learning | lecciones, misiones y checkpoints | actividad del alumno |
| Voice | autorización y metadatos de sesiones | voz/transcripción efímera |
| Evidence | respuestas y evidencia derivada | rendimiento educativo |
| Mastery | dominio, frescura y recomendaciones | perfil educativo |
| Assessment | placement, gates, blueprints y scoring | resultados de evaluación |
| Human Review | revisión, discrepancias y apelaciones | decisión de alto impacto |
| Safety | señales, casos, acciones y escalamiento | revelaciones potencialmente sensibles |
| Commerce | pagador, suscripción, minutos y reembolsos | datos comerciales del adulto |
| Notification | preferencias, quiet hours y plantillas | contacto del apoderado |
| Support | tickets de alumno y familia | contenido de soporte |
| Audit | accesos y cambios críticos | metadatos de trazabilidad |
| Analytics | eventos permitidos y métricas agregadas | IDs seudónimos |

Cada módulo expone una interfaz interna. Ningún módulo escribe directamente en tablas de otro salvo mediante servicio de dominio o transacción orquestada documentada.

---

## 7. Modelo de datos 12+

### 7.1 Entidades principales nuevas

~~~mermaid
erDiagram
    USER ||--o| GUARDIAN_PROFILE : "puede ser"
    USER ||--o| LEARNER_PROFILE : "puede ser"
    GUARDIAN_PROFILE ||--o{ GUARDIAN_LEARNER_LINK : "mantiene"
    LEARNER_PROFILE ||--o{ GUARDIAN_LEARNER_LINK : "está vinculado"
    GUARDIAN_LEARNER_LINK ||--o{ CONSENT_GRANT : "autoriza"
    LEARNER_PROFILE ||--o{ YOUTH_ASSENT : "otorga"
    LEARNER_PROFILE ||--o{ ENROLLMENT : "cursa"
    ENROLLMENT ||--o{ LEARNING_EVIDENCE : "genera"
    LEARNING_EVIDENCE ||--o{ MASTERY_STATE : "actualiza"
    ENROLLMENT ||--o{ HUMAN_REVIEW : "requiere"
    LEARNER_PROFILE ||--o{ SAFETY_CASE : "puede originar"
    USER ||--o{ AUDIT_EVENT : "realiza"
~~~

### 7.2 Tablas mínimas

- `users`
- `guardian_profiles`
- `learner_profiles`
- `guardian_learner_links`
- `guardian_invitations`
- `age_assurance_checks`
- `consent_grants`
- `youth_assents`
- `authorized_devices`
- `enrollments`
- `subscriptions` y `payers`
- `curriculum_versions`, `competencies`, `activities`
- `learning_sessions`, `voice_sessions`
- `learning_evidence`, `mastery_states`
- `assessment_attempts`, `scores`, `decision_explanations`
- `human_reviews`, `appeals`
- `safety_signals`, `safety_cases`, `safety_actions`
- `privacy_requests`, `retention_jobs`
- `model_configs`, `prompt_versions`, `evaluation_runs`
- `audit_events`, `outbox_events`

### 7.3 Separación lógica

- El esquema `identity` contiene identidad y contactos.
- El esquema `learning` usa `learner_id` seudónimo y no necesita dirección, DNI o email.
- El esquema `safety` tiene acceso muy restringido y plazos propios.
- El esquema `commerce` pertenece al pagador adulto.
- Analítica recibe `analytics_subject_id` rotatable, nunca nombre, audio o texto libre.

### 7.4 Reglas de consistencia

- Un menor no puede tener enrollment activo sin vínculo autorizado y grants vigentes.
- Puede existir más de un apoderado; cada vínculo tiene alcance, vigencia y estado.
- Un pagador no obtiene automáticamente autoridad legal ni acceso académico.
- Todo resultado de alta consecuencia de un menor permanece `provisional` hasta la revisión correspondiente.
- El cumplimiento de 18 años dispara `age.transitioned_to_adult`, nuevo consentimiento y revisión de permisos del apoderado.
- Borrar una cuenta no borra silenciosamente auditoría que deba conservarse; se disocia o bloquea conforme a política y revisión legal.

---

## 8. Arquitectura de voz e IA

### 8.1 Dos rutas, no una sola

| Ruta | Uso | Motivo |
|---|---|---|
| **Realtime speech-to-speech** | lecciones, roleplays y práctica oral controlada | naturalidad, interrupción y baja latencia |
| **Pipeline encadenado** | placement, puertas, Writing/Speaking puntuado y flujos sensibles | texto intermedio, moderación, reproducibilidad y auditoría |

OpenAI recomienda WebRTC para voz desde navegador y mantener claves estándar en servidor. El servidor puede unirse a la misma sesión por un canal sideband para monitorear, cambiar instrucciones y responder tools. Fuentes: [Voice agents](https://developers.openai.com/api/docs/guides/voice-agents), [Realtime WebRTC](https://developers.openai.com/api/docs/guides/realtime-webrtc) y [server-side controls](https://developers.openai.com/api/docs/guides/realtime-server-controls).

### 8.2 Flujo Realtime

~~~mermaid
sequenceDiagram
    participant L as Alumno
    participant W as Web/PWA
    participant S as API Voice
    participant R as OpenAI Realtime
    participant G as Safety Gateway
    participant C as Núcleo STAR

    L->>W: Inicia misión de voz
    W->>S: Solicita sesión
    S->>S: Verifica edad, grants, plan y ZDR
    S->>R: Crea sesión con configuración y Safety Identifier
    R-->>S: SDP / secreto efímero
    S-->>W: Respuesta de conexión limitada
    W->>R: Audio por WebRTC
    S->>R: Sideband de control
    R-->>W: Audio + eventos/transcripción
    R-->>S: Eventos de sesión
    S->>G: Fragmentos transcritos y metadatos mínimos
    G-->>S: continuar, redirigir, pausar o escalar
    S->>C: Tools permitidas y evidencia derivada
    C-->>S: Acción autorizada
~~~

### 8.3 Creación segura de sesión

La API `/voice/sessions` comprobará:

1. autenticación y dispositivo;
2. banda de edad;
3. relación con apoderado;
4. consentimiento de voz y transferencia;
5. asentimiento vigente;
6. horario y límites del plan;
7. actividad curricular aprobada;
8. configuración ZDR requerida;
9. modelo/prompt aprobados para esa edad;
10. capacidad de escalamiento disponible.

La sesión llevará un `OpenAI-Safety-Identifier` estable pero seudónimo, generado con HMAC del identificador interno y una clave rotada. Nunca se envía email, nombre, fecha de nacimiento o ID legal.

### 8.4 Modelo y routing

- Comenzar el piloto juvenil con el modelo Realtime insignia vigente y validado, no con una selección automática del más barato.
- Evaluar el modelo mini únicamente en ejercicios cerrados después de superar gold sets de seguridad, calidad e instrucción.
- Casos ambiguos, reparación compleja y safety usan el modelo más robusto aprobado.
- Assessment no depende de la conversación Realtime: transcribe, puntúa contra rúbrica versionada, calcula confianza y crea revisión.
- Cada decisión registra `provider`, `model_family`, snapshot/versión disponible, `prompt_version`, `rubric_version`, latencia y costo.
- El cambio de modelo se lanza por feature flag, cohorte canaria y rollback.

OpenAI recomienda usar sus modelos insignia más actuales para experiencias con menores y probar primero el modelo grande antes de optimizar con un mini. Fuentes: [Under 18 API Guidance](https://developers.openai.com/api/docs/guides/safety-checks/under-18-api-guidance) y [Managing Realtime costs](https://developers.openai.com/api/docs/guides/realtime-costs).

### 8.5 Memoria del Mentor

La memoria persistente contiene solo información pedagógica permitida:

- competencias vistas;
- errores lingüísticos frecuentes;
- vocabulario en reparación;
- apoyos de accesibilidad elegidos;
- velocidad de habla preferida;
- evidencia y próxima revisión.

No contiene secretos, diagnósticos, orientación sexual, religión, estado emocional inferido, conflictos familiares, dirección, colegio, teléfono, redes sociales ni una copia de la conversación.

### 8.6 Tools permitidas

El Mentor no recibe acceso genérico a SQL, pagos, identidad, web o archivos. Puede invocar funciones estrechas:

- `get_lesson_contract`
- `get_approved_activity`
- `get_safe_learner_context`
- `record_practice_evidence`
- `request_repair_item`
- `schedule_review`
- `pause_voice_session`
- `report_content_issue`
- `raise_safety_signal`

Todas validan esquema, autorización, límites y estado en servidor. Ningún tool puede emitir certificado, cambiar nivel definitivo, comprar minutos o leer datos del apoderado.

---

## 9. Safety Gateway para menores

Un system prompt es una capa, no un sistema de protección.

### 9.1 Capas

1. **Contrato de actividad:** tema, vocabulario, rol, duración, límites y salidas permitidas.
2. **Prompt juvenil versionado:** identidad IA, tono, no secretos, no contacto externo y no dependencia afectiva.
3. **Herramientas limitadas:** allowlist y validación en servidor.
4. **Transcripción paralela:** entrada y salida en fragmentos; no implica persistencia completa.
5. **Moderación:** texto e imágenes con Moderation API; el endpoint no clasifica audio directamente.
6. **Reglas Starbiz:** PII, grooming, sextorsión, abuso, bullying, autolesión, violencia y amenazas.
7. **Control sideband:** capacidad de pausar respuesta, cambiar instrucciones, cerrar sesión y abrir un caso.
8. **Escalamiento humano:** responsable con protocolo y SLA.
9. **Red team y replay:** casos sintéticos y regresión continua.

La Moderation API debe tratarse como señal, no como una decisión automática infalible. Fuente: [OpenAI Moderation](https://developers.openai.com/api/docs/guides/moderation).

### 9.2 Límites obligatorios del Mentor

El Mentor:

- siempre dice que es una IA educativa cuando sea relevante;
- no pide secretos ni sugiere ocultar conversaciones al adulto;
- no solicita dirección, colegio, teléfono, fotos, ubicación o redes;
- no intenta contacto fuera de Starbiz;
- no coquetea, sexualiza ni representa relaciones románticas;
- no dice “solo yo te entiendo”, “te necesito” o equivalentes de dependencia;
- no diagnostica, no da terapia y no se presenta como servicio de emergencia;
- no infiere emociones o personalidad desde la voz;
- no usa vergüenza, culpa o amenazas para lograr estudio;
- redirige temas fuera de la misión sin castigar al alumno.

### 9.3 Severidades

| Nivel | Ejemplos | Acción del sistema | Acción humana |
|---|---|---|---|
| P0 | riesgo inminente, explotación sexual/grooming, amenaza creíble, autolesión con intención | interrumpir/contener, respuesta segura, crear caso urgente | triage inmediato según cobertura y protocolo |
| P1 | revelación de abuso, autolesión no inminente, violencia familiar | limitar la conversación y orientar de forma segura | revisión prioritaria; no notificar automáticamente al posible agresor |
| P2 | bullying, amenaza vaga, solicitud de PII, contenido sexual no dirigido | redirección, protección de datos y registro mínimo | revisión diferida según umbral |
| P3 | desvío de tema o lenguaje inapropiado leve | recordatorio y retorno a la misión | métricas agregadas |

Los tiempos exactos se aprueban con la política de salvaguarda. El software no codificará “avisar siempre al apoderado”: un caso puede involucrar al hogar y requiere criterio profesional y legal.

### 9.4 Datos de safety

- Guardar solo el fragmento mínimo necesario, no toda la clase.
- Acceso exclusivo para roles autorizados; todo acceso queda auditado.
- Retención definida por severidad, obligación y resolución.
- Nunca reutilizar un caso para marketing o entrenamiento general.
- Los dashboards de producto no exponen texto de safety.

---

## 10. Evaluación y revisión humana

### 10.1 Flujo

~~~mermaid
flowchart LR
    A["Respuesta del alumno"] --> B["Scoring automático versionado"]
    B --> C["Confianza y explicación"]
    C --> D{"¿Menor + decisión significativa?"}
    D -- No --> E["Resultado automático de baja consecuencia"]
    D -- Sí --> F["Estado provisional"]
    F --> G["Cola de revisión pedagógica"]
    G --> H{"Confirmar, corregir o invalidar"}
    H --> I["Decisión publicada"]
    I --> J["Apelación disponible"]
~~~

### 10.2 Qué requiere revisión

- Placement definitivo y asignación de nivel.
- Puerta de etapa o decisión que impide continuar.
- Invalidación por integridad o conducta de examen.
- Readiness TOEFL y certificado Starbiz.
- Casos de baja confianza o discrepancia Speaking/Writing.
- Apelaciones.

La recomendación de “repasar la competencia X mañana” no necesita revisión; el bloqueo de la ruta o la declaración de dominio final sí.

### 10.3 Consola del revisor

Debe mostrar:

- muestra original disponible bajo permiso;
- transcripción redactada cuando sea suficiente;
- rúbrica y criterios;
- score IA por criterio;
- confianza, advertencias y dispositivo;
- historial relevante sin datos comerciales;
- botones confirmar/corregir/invalidar;
- motivo obligatorio y firma de auditoría.

### 10.4 Integridad

No se usará webcam, reconocimiento facial, biometría, emoción o vigilancia de pantalla en el MVP. Señales técnicas solo crean un caso; no prueban trampa ni sancionan automáticamente.

---

## 11. Privacidad y retención

### 11.1 Política por defecto

| Categoría | Default recomendado | Observación |
|---|---|---|
| Audio de práctica | no persistir | streaming efímero; conservar evidencia derivada |
| Transcripción de práctica | no persistir completa | redactar y extraer errores/competencias |
| Audio de evaluación | no persistir salvo finalidad/consentimiento y revisión legal | preferir muestra temporal con borrado automático |
| Respuesta Writing | conservar como evidencia mientras exista relación/expediente | política publicada y derechos |
| Evidencia académica | conservar con minimización | necesaria para progreso y apelación |
| Consentimiento | conservar prueba y versiones | aun después de revocación según obligación |
| Safety | mínimo necesario por severidad | acceso especialmente restringido |
| Analítica | seudónima y sin texto libre | TTL y agregación |

Los plazos definitivos se aprueban en la evaluación de impacto. “ZDR de OpenAI” y “borrado interno de Starbiz” son controles distintos y ambos deben cumplirse.

### 11.2 Implementación

- Buckets separados: `practice-temp`, `assessment-evidence`, `exports`, `safety-restricted`.
- Cifrado con claves administradas; claves separadas para objetos de mayor sensibilidad cuando corresponda.
- Reglas de lifecycle, más un `RetentionService` que conoce expedientes, holds y revocaciones.
- URL firmada de minutos, no pública.
- Borrado verificado mediante job y evento `retention.object_deleted`.
- Redacción de PII antes de almacenar texto derivado.
- No usar session replay de terceros en pantallas juveniles, voz, pagos o backoffice sensible.

### 11.3 Transferencia y registro

Starbiz debe registrar/actualizar bancos de datos y declarar el flujo transfronterizo que corresponda. La política identifica proveedores, finalidades, países o garantías, plazos y canales de derechos. La arquitectura guarda un inventario de procesadores y la versión aceptada por cada familia.

---

## 12. Seguridad

### 12.1 Controles de plataforma

- Cloud Armor WAF y rate limits en endpoints públicos.
- CAPTCHA adaptativo solo ante riesgo; evitar fricción constante para jóvenes.
- Identity Platform, cookies `HttpOnly`, `Secure`, `SameSite` y rotación de sesiones.
- MFA obligatorio para personal y step-up para consentimiento, exportación, cierre y pagos del apoderado.
- RBAC más políticas por relación: un guardian solo ve learners vinculados y scopes activos.
- RLS de PostgreSQL en tablas críticas como defensa adicional.
- IAM de mínimo privilegio y service accounts por workload.
- Secret Manager; Workload Identity en CI, sin claves cloud persistentes.
- Cifrado en tránsito y reposo; KMS para material sensible.
- Dependencias escaneadas, SBOM, imágenes mínimas y escaneo de contenedores.
- Backups, PITR, restauración trimestral y runbook de desastre.
- Pruebas SAST, DAST y penetración antes del piloto pagado.

### 12.2 Acceso sensible

Audio, Writing, safety y evaluación requieren propósito de acceso. El sistema registra:

- quién accedió;
- a qué objeto;
- rol y caso asociado;
- finalidad;
- fecha, dispositivo y duración;
- exportación o acción realizada.

Soporte no ve el banco seguro ni casos de safety salvo derivación autorizada. Finanzas no ve aprendizaje. Revisores no ven pagos.

### 12.3 Incidentes

El stack incluye:

- clasificación de severidad;
- canal interno de reporte;
- preservación mínima de evidencia;
- runbook de contención y rotación;
- registro de afectados y datos expuestos;
- reloj de notificación;
- mensajes diferenciados para joven y apoderado;
- simulacro previo al lanzamiento.

La normativa peruana contempla comunicaciones de incidentes dentro de 48 horas en determinados supuestos. El SLA legal final debe validarse por el responsable de privacidad.

---

## 13. APIs y eventos

### 13.1 Endpoints principales

~~~text
/auth/*
/age-assurance/*
/guardians/*
/family-links/*
/consents/*
/assents/*
/learners/me
/guardian/learners/:id/summary
/enrollments/*
/diagnostic/*
/learning/today
/lessons/*
/voice/sessions/*
/evidence/*
/assessment/*
/human-reviews/*
/appeals/*
/safety/report
/privacy-requests/*
/subscriptions/*
/usage/*
/support/*
/admin/content/*
/admin/assessment/*
/admin/ai-quality/*
/admin/safety/*
~~~

### 13.2 Reglas de API

- DTO versionado, validación de esquema y límite de tamaño.
- `Idempotency-Key` para pagos, consentimientos, scoring y creación de tareas.
- ETags o control de versión para edición curricular.
- Paginación por cursor.
- Errores con código estable y mensaje juvenil separado del detalle interno.
- Autorización en servidor por acción, objeto, relación y edad.
- No devolver campos que el cliente “deba ocultar”; el servidor los excluye.

### 13.3 Eventos esenciales

- `guardian.invited`, `guardian.verified`, `guardian.linked`
- `consent.granted`, `consent.revoked`, `assent.recorded`
- `learner.activated`, `age.transitioned_to_adult`
- `voice.session_started`, `voice.session_ended`, `usage.recorded`
- `evidence.created`, `mastery.updated`
- `assessment.submitted`, `human_review.requested`, `human_review.completed`
- `appeal.opened`, `appeal.resolved`
- `safety.alerted`, `safety.triaged`, `safety.resolved`
- `privacy.requested`, `retention.executed`

Se implementa transactional outbox en PostgreSQL para no perder eventos entre la transacción y Cloud Tasks/Pub/Sub.

---

## 14. Observabilidad, calidad y costos

### 14.1 Telemetría permitida

OpenTelemetry propagará `trace_id`, `request_id`, `session_id` seudónimo, módulo, versión y resultado técnico. Logs no aceptarán por defecto:

- audio;
- prompts completos con datos de alumno;
- transcripciones;
- email/teléfono;
- tokens de sesión;
- respuestas de evaluación;
- texto de safety.

Un logger central aplica redacción y allowlist. Producción no usa `console.log` libre.

### 14.2 SLO inicial

| Indicador | Objetivo de piloto |
|---|---:|
| Disponibilidad de recorridos principales | 99.5% mensual |
| Creación técnica de sesión de voz | p95 < 5 s |
| Sesiones de voz completadas sin fallo técnico | ≥ 97% |
| Persistencia de evidencia válida | 99.9% |
| Pérdida de progreso | 0 incidentes tolerados |
| Acciones críticas auditadas | 100% |
| Consentimiento inválido que activa voz | 0 |
| Sesión 12–13 sin ZDR verificado | 0 |
| Decisión significativa juvenil sin review requerido | 0 |

La latencia de primera respuesta se mide por país/dispositivo antes de publicarla como promesa.

### 14.3 Contabilidad de IA

Cada `ai_usage_record` guarda:

- alumno seudónimo y plan;
- sesión/actividad;
- modelo y versión;
- tokens por modalidad, cache y transcripción;
- segundos de audio de entrada/salida;
- costo calculado con tabla versionada;
- centro de costo: learning, assessment, safety o QA.

OpenAI explica que el audio del usuario equivale aproximadamente a un token por 100 ms y el audio del asistente a un token por 50 ms; además, las conversaciones multi-turno vuelven a introducir historial, por lo que el costo real no debe estimarse solo multiplicando minutos. Fuente: [Managing Realtime costs](https://developers.openai.com/api/docs/guides/realtime-costs).

### 14.4 Estrategias de costo que no reducen seguridad

- sesiones con objetivo y duración definidos;
- VAD para no facturar silencios innecesarios;
- instrucciones y tools estables para favorecer cache;
- truncación/resumen pedagógico controlado;
- modelo grande como base juvenil y mini solo tras validación;
- pipeline asíncrono barato para tareas no interactivas;
- límites de minutos visibles al apoderado;
- alertas 70/90/100%, sin cobros automáticos ocultos;
- presupuesto y circuit breaker por proyecto/modelo.

### 14.5 Fórmula comercial

~~~text
costo_variable_alumno =
  voz_realtime
  + transcripción/scoring
  + infraestructura prorrateada
  + verificación de identidad
  + revisión humana
  + soporte/safety
  + comisión de pago
~~~

No debe mantenerse la rentabilidad histórica sin recalcular la revisión humana, ZDR, verificación del apoderado y mayor uso del modelo insignia. El piloto medirá costo por hora efectiva y por competencia dominada para Flex, Accelerated y Sprint.

---

## 15. Analítica responsable

### 15.1 Lo que sí se mide

- activación de familia y alumno;
- tiempo hasta primer aprendizaje útil;
- horas previstas/realizadas;
- ganancia por 100 horas y retención;
- abandono, pausas y fatiga autoinformada;
- acuerdo IA–humano y correcciones;
- apelaciones revertidas;
- solicitudes indebidas de PII y fallos de límites;
- incidentes y tiempos de triage;
- revocación, borrado y exportación dentro de SLA;
- costo por plan, edad y tipo de sesión.

### 15.2 Lo que no se mide

- “engagement” basado en maximizar tiempo sin valor;
- emoción inferida desde voz o cámara;
- localización precisa;
- relaciones sociales fuera del producto;
- texto íntimo para segmentación;
- perfiles publicitarios del menor.

### 15.3 Privacidad estadística

Dashboards agrupan por bandas 12–13, 14–15 y 16–17 solo con tamaños mínimos. Se suprimen celdas pequeñas y no se permite filtrar hasta identificar a un alumno. Casos de safety viven fuera de analítica general.

---

## 16. Pruebas y evaluación de IA

### 16.1 Pirámide de software

- Unitarias: reglas de dominio, permisos, cálculo de uso y retención.
- Integración: PostgreSQL real, Identity emulator/stub, Cloud Tasks y objetos.
- Contract: OpenAPI, eventos y adaptadores de proveedor.
- E2E: Playwright en alumno, apoderado y backoffice.
- Carga: k6 para API, creación de voz y colas.
- Seguridad: OWASP ZAP, escáner de dependencias, IaC y contenedores.
- Accesibilidad: axe + revisión manual con teclado/lector.

### 16.2 Gold sets de IA

Conjuntos versionados por banda de edad y acento:

- 200+ turnos de Tutor por banda;
- 200+ fragmentos de voz;
- 100+ respuestas de Speaking y 100+ de Writing;
- 100+ intentos de pedir PII/contacto;
- 100+ casos de grooming, sexual, autolesión, abuso, violencia y bullying;
- jailbreaks y prompt injection;
- ruido, tartamudez, dislexia, mala red y dispositivos básicos;
- casos de inglés correcto con temas sensibles para medir falsos positivos.

Cada cambio de modelo, prompt, rúbrica o safety policy ejecuta regresión. Los resultados se comparan con la versión vigente; si deteriora un gate, no se despliega.

### 16.3 Pruebas familiares

- menor invita a adulto equivocado;
- dos apoderados con permisos diferentes;
- revocación durante una sesión;
- vínculo vencido;
- edad falsa o no verificable;
- cumplimiento de 14 y 18 años;
- pérdida de dispositivo;
- apoderado que exige transcripción no autorizada;
- pagador distinto del representante legal;
- conflicto de custodia derivado a revisión.

### 16.4 Safety drills

Antes del piloto:

1. simular P0 y P1;
2. comprobar pausa de sesión;
3. medir alerta y triage;
4. verificar mínima evidencia;
5. ensayar comunicación y no notificación automática al posible agresor;
6. documentar acciones y retrospectiva.

---

## 17. CI/CD y gobierno de cambios

### 17.1 Ambientes

- `local`: datos sintéticos, proveedores simulados.
- `development`: integración compartida sin datos reales de menores.
- `staging`: configuración similar a producción y cohortes sintéticas.
- `production-minors`: proyecto y datos aislados, ZDR, accesos restringidos.

Nunca se copian datos de producción a staging. Los casos para replay se redactan o son sintéticos.

### 17.2 Pipeline

1. lint, tipos y unitarias;
2. escaneo de secretos/dependencias/IaC;
3. build reproducible y SBOM;
4. integración y contract tests;
5. E2E/accesibilidad;
6. gold sets de IA afectados;
7. imagen a Artifact Registry;
8. despliegue a staging;
9. aprobación para cambios de alto riesgo;
10. canary de producción, métricas y rollback.

GitHub Actions usa Workload Identity Federation; no almacena una clave JSON permanente de GCP.

### 17.3 Feature flags

Flags para modelo, prompt, actividad, banda de edad y porcentaje de cohorte. Ningún flag puede saltarse consentimiento, ZDR, revisión humana o safety. Los flags críticos tienen propietario, fecha de expiración y valor seguro por defecto.

---

## 18. Escalamiento

### Etapa A — corte vertical, hasta 30 familias

- Cloud Run con mínimo bajo.
- Cloud SQL zonal con PITR si el riesgo/ventana lo acepta; producción pagada migra a HA.
- Cloud Tasks.
- Eventos operativos en PostgreSQL.
- Revisión humana total de decisiones juveniles.

### Etapa B — piloto, 80–150 familias

- Cloud SQL HA regional.
- `voice-control` separado del API.
- dashboards de costos/safety.
- BigQuery solo con esquema de eventos aprobado.
- on-call y runbooks.

### Etapa C — 1,000+ alumnos activos

- autoscaling y pruebas al doble de pico;
- Redis si reduce una carga medida;
- Pub/Sub para fan-out real;
- réplicas de lectura si las consultas lo justifican;
- separar Assessment/Safety únicamente si seguridad o equipos lo requieren;
- DR cross-region según RTO/RPO comercial.

### Etapa D — expansión internacional

- tenant/país, reglas de consentimiento y residencia configurables;
- proveedores de pago/notificación por país;
- política y contenido por jurisdicción;
- no activar un país solo cambiando moneda e idioma.

---

## 19. Plan de construcción revisado

El cambio a 12+ amplía el alcance. Las cifras anteriores de un MVP adulto no deben reutilizarse sin reestimar.

### Fase 0 — arquitectura, legal y prototipo, 4–6 semanas

- evaluación de impacto de privacidad e IA;
- solicitud ZDR y proyecto de menores;
- ADR de cloud, región y proveedores;
- mapa de datos y retención;
- protocolo safeguarding y revisión académica;
- prototipo de voz por edad;
- blueprint del corte vertical.

**Gate:** ZDR encaminado/aprobado según cohorte, consentimiento definido y responsables nombrados.

### Fase 1 — corte vertical 12+, 8–12 semanas

- cuenta apoderado + perfil juvenil;
- verificación, consentimiento y asentimiento;
- pago por adulto;
- una unidad juvenil completa;
- voz Realtime con sideband y Safety Gateway;
- evidencia, reparación y revisión;
- decisión significativa con ratificación humana;
- panel del alumno y resumen del apoderado;
- reporte/safety y auditoría.

### Fase 2 — MVP de piloto, 14–20 semanas adicionales

- StarMap juvenil modular;
- contenido B1→B2 para 8–12 semanas;
- backoffice de currículo/evaluación;
- Flex y Accelerated; Sprint solo si se valida por edad;
- privacidad, exportación, borrado y transición;
- observabilidad, costos y operación familiar.

### Fase 3 — piloto académico, 12–16 semanas

- comenzar 14–17 si ZDR/operación 12–13 aún no cumple gates;
- 12–13 solo después de aprobación completa;
- pre/postest independiente;
- acuerdo IA–humano y sesgo por edad/acento/dispositivo;
- safety drills y revisión de carga escolar;
- evidencia externa consentida.

### Estimación inicial

- Corte vertical juvenil: aproximadamente 3–4 meses con equipo completo.
- MVP pagado limitado: aproximadamente 6–9 meses.
- Evidencia académica inicial: aproximadamente 9–12 meses.

Son rangos de planificación, no cotización. Dependen especialmente de contenido listo, ZDR, proveedor de verificación, cobertura humana y tamaño del equipo.

---

## 20. Equipo mínimo

### Construcción

- 1 Product Lead.
- 1 UX/Product Designer con experiencia juvenil/accesibilidad.
- 2 frontend.
- 2 backend/plataforma.
- 1 IA/voice engineer.
- 1 QA automation.
- DevOps/SRE parcial al inicio, creciente antes de pago.

### Académico y protección

- Director académico.
- Especialista curricular B1→B2 y TOEFL.
- Especialista de evaluación/psicometría.
- Revisor de desarrollo adolescente o currículo juvenil.
- Revisores pedagógicos humanos.
- Responsable de salvaguarda infantil/Trust & Safety.
- Oficial o responsable de privacidad.
- Soporte para familias.

Las mismas personas pueden cubrir más de un rol en el alfa si no existe conflicto de funciones y están capacitadas; no pueden desaparecer las responsabilidades.

---

## 21. Decisiones de compra e integración

| Capacidad | Construir | Comprar/integrar |
|---|---|---|
| Currículo, mastery, evidencia y reglas | Sí; son propiedad central | No delegar la fuente de verdad |
| Experiencia alumno/apoderado | Sí | Componentes UI accesibles |
| Autenticación base | No | Identity Platform |
| Age/guardian verification | Adaptador y política | Proveedor sujeto a privacidad/costo |
| Voz y modelos | Gateway y control propios | OpenAI API |
| Pagos | Adaptador | Proveedor peruano aprobado |
| Email | Plantillas y preferencias propias | Proveedor transaccional |
| Infraestructura | Terraform propio | Google Cloud administrado |
| Certificado y reportes | Sí | Motor PDF/librería |
| Safety policy/casos | Sí | Moderation como una señal |

El proveedor de pagos se seleccionará entre opciones operativas en Perú mediante una matriz de comisión, conciliación, suscripción, tokenización, chargebacks, soporte y DPA. La arquitectura no acopla `subscription` a un proveedor específico.

---

## 22. ADR principales

### ADR-001 — Monolito modular

**Decisión:** un API desplegable con módulos estrictos y workers separados.  
**Razón:** menor tiempo y costo; transacciones académicas consistentes.  
**Revisar cuando:** un dominio tenga escala, seguridad o cadencia independiente demostrada.

### ADR-002 — Google Cloud unificado

**Decisión:** Cloud Run, Cloud SQL, Storage, Tasks, Identity Platform y observabilidad nativa.  
**Razón:** menos proveedores de datos y operación serverless/administrada.  
**Riesgo:** dependencia de cloud; mitigado con contenedores, PostgreSQL, OpenTelemetry y Terraform.

### ADR-003 — Realtime + pipeline encadenado

**Decisión:** Realtime para conversación; pipeline controlado para evaluación.  
**Razón:** equilibrio entre naturalidad, moderación, trazabilidad y reproducibilidad.

### ADR-004 — Audio no persistente por defecto

**Decisión:** práctica juvenil se procesa en streaming y se guarda solo evidencia derivada.  
**Razón:** voz de menores, minimización, ZDR y menor impacto ante incidentes.

### ADR-005 — Doble capa de decisión

**Decisión:** IA recomienda/scorea; humano ratifica decisiones significativas de menores.  
**Razón:** normativa peruana, calidad académica y apelación.

### ADR-006 — Sin comunidad social en MVP

**Decisión:** no hay DMs, perfiles públicos ni leaderboards globales.  
**Razón:** no es necesario para demostrar aprendizaje y aumenta considerablemente el riesgo infantil.

---

## 23. Gates de lanzamiento 12+

No se activa producción juvenil pagada hasta comprobar:

- [ ] Rango exacto y políticas 12–13/14–17 aprobados.
- [ ] ZDR aprobado, configurado y verificado para el proyecto de menores.
- [ ] Ningún endpoint persistente de OpenAI no aprobado contiene estado juvenil.
- [ ] Flujo apoderado–alumno probado de extremo a extremo.
- [ ] Consentimientos separados, versionados, revocables y demostrables.
- [ ] Age assurance y vínculo de autoridad definidos.
- [ ] Evaluación de impacto de privacidad e IA firmada.
- [ ] Banco de datos y transferencia internacional revisados/registrados.
- [ ] Audio juvenil no se conserva por defecto.
- [ ] Safety Gateway, botón de reporte, kill switch y protocolo probados.
- [ ] Responsable humano y cobertura de safeguarding activos.
- [ ] Placement/promoción/readiness/certificado exigen revisión humana.
- [ ] 100+ casos adversariales por banda etaria superados.
- [ ] Exportación, supresión, revocación y transición a 18 probadas.
- [ ] Incidente de datos y P0 de safety simulados.
- [ ] Restauración de backup verificada.
- [ ] Costos y límites por plan visibles y alertados.
- [ ] Accesibilidad WCAG 2.2 AA en recorridos críticos.
- [ ] Revisión legal peruana especializada completada.

---

## 24. Backlog técnico priorizado

### P0 — corte vertical

1. Monorepo, CI/CD e infraestructura base.
2. Identity Platform y RBAC relacional.
3. Family, AgeAssurance, Consent y Assent.
4. Esquema curricular/evidencia mínimo.
5. Web alumno + portal apoderado.
6. Voice Session Service con Realtime/WebRTC/sideband.
7. Safety Gateway y consola de casos.
8. Assessment provisional + Human Review.
9. Audit, Privacy Requests y Retention.
10. Uso/costos y observabilidad.

### P1 — piloto

11. StarMap juvenil modular.
12. Backoffice curricular y versionado.
13. Pagos, planes y cupos.
14. Notifications/quiet hours.
15. Gold sets y dashboard de IA.
16. Accesibilidad ampliada y baja conectividad.
17. Reportes familiares y apelaciones.
18. HA, restore drill y on-call.

### P2 — después de validar

19. BigQuery y experimentación controlada.
20. Mini model routing por ejercicios aprobados.
21. Apps nativas.
22. Comunidad segura, únicamente si existe una necesidad pedagógica y un diseño propio de moderación.
23. Expansión A0→B1 y C1.
24. Multi-país y multi-moneda.

---

## 25. Fuentes oficiales principales

### OpenAI

- [Under 18 API Guidance](https://developers.openai.com/api/docs/guides/safety-checks/under-18-api-guidance)
- [Data controls in the OpenAI platform](https://developers.openai.com/api/docs/guides/your-data)
- [Voice agents](https://developers.openai.com/api/docs/guides/voice-agents)
- [Realtime API with WebRTC](https://developers.openai.com/api/docs/guides/realtime-webrtc)
- [Realtime server-side controls](https://developers.openai.com/api/docs/guides/realtime-server-controls)
- [Moderation](https://developers.openai.com/api/docs/guides/moderation)
- [Safety best practices](https://developers.openai.com/api/docs/guides/safety-best-practices)
- [Managing Realtime costs](https://developers.openai.com/api/docs/guides/realtime-costs)
- [API pricing](https://developers.openai.com/api/docs/pricing)

### Perú

- [D.S. 016-2024-JUS, Reglamento de Protección de Datos Personales](https://epdoc2.elperuano.pe/EpPo/VistaNLSE.asp?Referencias=MjM0OTY1My0xMjAyNDExMzA%3D)
- [Resumen oficial del nuevo reglamento de datos](https://www.gob.pe/institucion/minjus/noticias/1067368-ejecutivo-aprueba-nuevo-reglamento-de-la-ley-de-proteccion-de-datos-personales)
- [D.S. 115-2025-PCM, Reglamento peruano de IA](https://www3.congreso.gob.pe/Docs/DGP/DIDP/files/ds_115-2025-pcm.pdf)
- [Ley 29733 de Protección de Datos Personales](https://www.gob.pe/institucion/congreso-de-la-republica/normas-legales/243470-29733)

### Google Cloud

- [Cloud Run y WebSockets](https://docs.cloud.google.com/run/docs/triggering/websockets)
- [Cloud SQL high availability](https://docs.cloud.google.com/sql/docs/postgres/high-availability)
- [Cloud Storage lifecycle](https://docs.cloud.google.com/storage/docs/lifecycle)
- [Cloud Tasks overview](https://docs.cloud.google.com/tasks/docs/dual-overview)
- [Identity Platform](https://docs.cloud.google.com/identity-platform/docs)
- [Cloud Armor rate limiting](https://docs.cloud.google.com/armor/docs/configure-rate-limiting)

---

## 26. Conclusión

El producto para jóvenes desde los 12 años es viable, pero su ventaja no puede ser solamente “un profesor con voz de IA”. La ventaja defendible será la unión de:

`currículo propio + voz natural + evidencia + dominio + familia + protección infantil + evaluación responsable + mejora versionada`

Este stack permite construirlo sin una arquitectura exagerada y sin ocultar los requisitos difíciles. La condición más importante es mantener alineadas tecnología, metodología y operación: si el producto promete 12+, el consentimiento, ZDR, revisión humana y safeguarding deben existir en el primer corte vertical, no en una fase futura.
