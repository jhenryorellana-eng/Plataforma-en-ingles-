# Arquitectura Multilingüe STAR Learning OS

**Empresa:** StarbizAcademy  
**Versión:** 1.0  
**Fecha:** 15 de julio de 2026  
**Estado:** especificación técnica lista para estimación y construcción  
**Alcance:** una plataforma, dos programas iniciales: English Path y Spanish Path  
**Fuente de verdad:** este archivo Markdown; el HTML y el PDF son versiones generadas  
**Documentos base:** Stack Tecnológico STAR 12+ v1.0, Especificación de Producto y Plataforma STAR v1.1 y Metodología STAR Mastery v1.5

---

## 0. Decisión ejecutiva

Sí es viable integrar la enseñanza de español dentro de STAR sin crear una segunda plataforma.

La arquitectura correcta es:

> **Un solo STAR Learning OS, un solo código y un solo Mentor IA; cada idioma se publica como un programa académico independiente, versionado y auditable.**

Se conserva el stack ya seleccionado: Next.js, NestJS/Fastify, PostgreSQL en Cloud SQL, Google Cloud, OpenAI Realtime por WebRTC, procesos asíncronos, observabilidad y Terraform. No se introduce otro proveedor principal de base de datos ni un segundo backend.

English Path y Spanish Path comparten:

- cuentas, familias, pagos, permisos y protección juvenil;
- el STAR Loop: Scan, Train, Act, Reinforce;
- motores de planificación, evidencia, dominio y auditoría;
- infraestructura, aplicaciones web, gateway de IA y observabilidad;
- componentes visuales y experiencia del Mentor.

No comparten:

- currículo, competencias lingüísticas, diagnóstico ni bancos de actividades;
- rúbricas de producción oral y escrita;
- memoria pedagógica ni progreso del alumno;
- política de pronunciación y variedades aceptadas;
- metas, simulacros ni reglas de certificación externa.

La unidad que separa todo es la **inscripción** (<code>enrollment</code>). Un mismo joven puede estar inscrito en English Path y Spanish Path al mismo tiempo, pero cada ruta conserva su propio nivel, plan, evidencias, dominio, minutos de voz y objetivo.

### 0.1 Resultado recomendado

| Tema | Decisión |
|---|---|
| Producto | Una academia digital de idiomas, no dos aplicaciones |
| Arquitectura | Monolito modular multi-programa |
| Programa actual | English Path conserva B1→B2 y preparación TOEFL |
| Nuevo programa | Spanish Path se construye como currículo ELE propio |
| Interfaz | Localizada independientemente del idioma estudiado |
| Voz | Mentor Realtime como agente educativo; traducción solo como apoyo puntual |
| Progreso | Aislado por inscripción y versión curricular |
| Lanzamiento | Inglés sigue siendo la ruta crítica; español se habilita por fases y feature flags |
| Datos | Cloud SQL PostgreSQL continúa como fuente transaccional |
| Menores | Audio no persistido por defecto, consentimiento y controles 12+ |

### 0.2 Una aclaración comercial necesaria

StarbizAcademy puede emitir su propio certificado de finalización y evidencia de dominio. No debe afirmar que “emite un certificado TOEFL, DELE o SIELE” salvo que exista autorización formal del organismo correspondiente. La promesa correcta es **preparación y readiness para alcanzar una meta externa**, seguida por el examen oficial administrado por su propietario.

---

## 1. Alcance y límites

### 1.1 Incluido en esta versión

- Arquitectura multi-programa para inglés y español.
- Stack concreto y responsabilidad de cada tecnología.
- Organización del monorepo y límites de módulos.
- Contrato de <code>Language Pack</code>.
- Separación entre idioma de interfaz, apoyo, aprendizaje y variedad.
- Modelo de datos PostgreSQL.
- Contratos REST y eventos.
- Flujo del diagnóstico, clase diaria, voz, evaluación y readiness.
- Diseño de seguridad, privacidad, menores y roles.
- Observabilidad técnica, académica y económica.
- Pruebas, evaluaciones de IA, despliegue y rollback.
- Roadmap para construirlo sin retrasar English Path.

### 1.2 Fuera de alcance

- Escribir todo el currículo de Spanish Path.
- Certificar por cuenta propia en nombre de ETS o Instituto Cervantes.
- Crear aplicaciones nativas separadas para iOS y Android en el MVP.
- Microservicios, Kubernetes, data lake o arquitectura de eventos compleja en la primera versión.
- Transferir automáticamente dominio entre idiomas.
- Entrenar un modelo fundacional propio.

### 1.3 Principios no negociables

1. La IA personaliza apoyo, práctica y tiempo; no inventa el estándar.
2. Toda decisión académica importante debe ser reproducible desde versiones y evidencia.
3. Un programa publicado es inmutable.
4. Toda evidencia, evaluación y dominio pertenece a una inscripción.
5. La interfaz no determina qué idioma aprende el alumno.
6. El Mentor conversa; el Examiner evalúa con un flujo separado y controlado.
7. Ninguna clave permanente de OpenAI llega al navegador.
8. El audio no se guarda por defecto.
9. Spanish Path no será una traducción de English Path.
10. No se publicará un idioma sin especialistas y gold sets propios.

---

## 2. Modelo conceptual de idiomas

Para evitar errores de producto y código, la plataforma trata cuatro conceptos como datos independientes:

| Campo | Pregunta que responde | Ejemplo English Path | Ejemplo Spanish Path |
|---|---|---|---|
| <code>target_language</code> | ¿Qué idioma aprende? | <code>en</code> | <code>es</code> |
| <code>support_language</code> | ¿En qué idioma puede explicar el Mentor? | <code>es</code> | <code>en</code> |
| <code>interface_locale</code> | ¿En qué idioma aparecen botones y mensajes? | <code>es-PE</code> | <code>en-US</code> |
| <code>target_variety</code> | ¿Qué variedad modela el Mentor? | <code>en-US</code> | <code>es-419</code> |

Las variedades aceptadas se almacenan por separado. Un alumno que usa una variedad legítima no debe ser penalizado por no imitar exactamente la variedad principal del Mentor.

### 2.1 Códigos

- Usar ISO 639 para el idioma base: <code>en</code>, <code>es</code>.
- Usar BCP 47 para localización y variedades: <code>en-US</code>, <code>en-GB</code>, <code>es-PE</code>, <code>es-MX</code>, <code>es-ES</code>, <code>es-419</code>.
- Almacenar códigos en minúsculas/mayúsculas canónicas y validarlos en el backend.
- No usar textos como “inglés americano” como identificadores técnicos.

### 2.2 Ejemplos válidos

- Interfaz en español, aprendizaje de inglés, explicaciones en español.
- Interfaz en inglés, aprendizaje de español, explicaciones en inglés.
- Interfaz en español, aprendizaje de español para un joven bilingüe, apoyo en inglés.
- Interfaz en inglés, aprendizaje de inglés, apoyo en español.

### 2.3 Regla de inmersión

Cada nivel y contrato de lección define:

- porcentaje esperado de uso del idioma objetivo;
- cuándo el alumno puede pedir una explicación;
- cantidad máxima de traducción;
- reglas de code-switching;
- modo de corrección;
- variedad que produce el Mentor y variedades que acepta.

El Mentor no decide estas reglas libremente. Las recibe del programa y de la lección.

---

## 3. Catálogo inicial de programas

### 3.1 English Path

| Atributo | Configuración |
|---|---|
| Código | <code>english-path</code> |
| Idioma objetivo | <code>en</code> |
| Apoyo inicial | <code>es</code> |
| Variedad principal | <code>en-US</code> |
| Variedades aceptadas | Configurables; no penalizar variantes legítimas |
| Framework | CEFR |
| Track inicial | General English B1→B2 |
| Objetivo externo | TOEFL iBT, meta 4.5 en la escala vigente |
| Estado | Ruta prioritaria del MVP |

TOEFL es un **track y objetivo de English Path**, no la definición de toda la plataforma.

### 3.2 Spanish Path

| Atributo | Configuración recomendada para piloto |
|---|---|
| Código | <code>spanish-path</code> |
| Idioma objetivo | <code>es</code> |
| Apoyo inicial | <code>en</code> |
| Variedad principal | <code>es-419</code> |
| Variedades aceptadas | <code>es-PE</code>, <code>es-MX</code>, <code>es-CO</code>, <code>es-ES</code> y otras validadas |
| Framework | CEFR + PCIC como referencia académica |
| Primer corte vertical | A1 completo o A1.1→A1.2 |
| Objetivo externo | Configurable: DELE Escolar, DELE general, SIELE o resultado interno |
| Estado | Feature flag apagado hasta superar gates |

La certificación externa inicial de Spanish Path es una decisión académica y comercial pendiente. La arquitectura no depende de elegirla ahora.

### 3.3 Planes de ritmo

Flex, Accelerated y Sprint no cambian el estándar del programa. Solo cambian:

- horas semanales y calendario;
- densidad de práctica;
- minutos de voz incluidos;
- frecuencia de checkpoints;
- fecha estimada de finalización;
- precio y entitlement.

El mismo alumno, programa y versión curricular debe alcanzar el mismo estándar con cualquiera de los tres planes.

---

## 4. Arquitectura objetivo

~~~mermaid
flowchart LR
  subgraph Clientes
    WEB["Web responsive / PWA"]
    FAMILY["Portal familiar"]
    STAFF["Curriculum Studio y Staff"]
  end

  EDGE["Cloud CDN + Load Balancer + Cloud Armor"]
  NEXT["Next.js App Router\nCloud Run"]
  IDP["Google Identity Platform"]
  API["NestJS + Fastify\nMonolito modular"]
  WORKER["Worker asíncrono\nCloud Run Jobs/Service"]

  subgraph Nucleo["STAR Learning OS"]
    CATALOG["Program Catalog"]
    CURR["Curriculum + Language Packs"]
    LEARN["Enrollment + Learning"]
    VOICE["Voice Gateway + AI Orchestrator"]
    ASSESS["Assessment + Readiness"]
    SAFETY["Safety + Consent"]
    COMMERCE["Commerce + Entitlements"]
    AUDIT["Audit + Usage Ledger"]
  end

  DB[("Cloud SQL\nPostgreSQL")]
  STORAGE[("Cloud Storage\nassets y artefactos")]
  TASKS["Cloud Tasks"]
  SECRETS["Secret Manager"]
  OBS["OpenTelemetry\nCloud Monitoring/Trace"]
  OPENAI["OpenAI API\nRealtime + evaluación"]

  WEB --> EDGE
  FAMILY --> EDGE
  STAFF --> EDGE
  EDGE --> NEXT
  NEXT --> IDP
  NEXT --> API
  API --> Nucleo
  Nucleo --> DB
  Nucleo --> STORAGE
  Nucleo --> TASKS
  TASKS --> WORKER
  WORKER --> DB
  API --> SECRETS
  VOICE <--> OPENAI
  API --> OBS
  NEXT --> OBS
  WORKER --> OBS
~~~

### 4.1 Decisión de despliegue

El frontend, API y worker se despliegan como servicios separados, pero el dominio permanece en un monorepo y un monolito modular. Esto permite escalar la voz o los workers sin fragmentar prematuramente la lógica académica.

### 4.2 Qué cambia respecto del stack actual

No cambia el proveedor ni la base. Se añaden:

- módulo <code>ProgramCatalog</code>;
- módulo <code>Localization</code>;
- contrato y registro <code>LanguagePack</code>;
- contexto de inscripción obligatorio en aprendizaje, voz y evaluación;
- adaptadores de objetivos externos;
- índices, políticas y eventos con <code>program_id</code>, <code>program_version_id</code> y <code>enrollment_id</code>;
- feature flags por programa.

### 4.3 Qué no se debe hacer

- Crear <code>apps/spanish</code> y <code>apps/english</code>.
- Crear tablas duplicadas como <code>english_progress</code> y <code>spanish_progress</code>.
- Distribuir condiciones <code>if language === "es"</code> por toda la aplicación.
- Copiar prompts y cambiar únicamente el nombre del idioma.
- Usar traducción automática para producir el currículo de Spanish Path.
- Guardar una columna global <code>user_level</code>.

---

## 5. Stack tecnológico definitivo

| Capa | Tecnología | Responsabilidad |
|---|---|---|
| Monorepo | pnpm workspaces + Turborepo | Código, contratos, builds y caché |
| Lenguaje | TypeScript estricto | Web, API, worker y contratos |
| Web | Next.js App Router + React | Experiencia estudiante, familia y staff |
| Estilos | Tailwind CSS + tokens STAR | Diseño responsive y temas |
| Componentes | Componentes propios accesibles sobre primitives probadas | Consistencia sin encerrar el dominio |
| API | NestJS con Fastify | Casos de uso, autorización y OpenAPI |
| Validación | JSON Schema/OpenAPI + validación runtime | Contratos externos y eventos |
| Datos | Cloud SQL para PostgreSQL 17 | Fuente transaccional y auditoría |
| Migraciones | Prisma Migrate (decisión tomada en Stack v1.0 §4.3) | Esquema reproducible |
| Objetos | Google Cloud Storage | Assets curriculares y exportaciones |
| Asíncrono | Transactional Outbox + Cloud Tasks | Procesamiento fiable y reintentos |
| Identidad | Google Identity Platform | Login y federación |
| Voz | OpenAI Realtime por WebRTC | Conversación de baja latencia |
| Control de voz | Sideband server-side por WebSocket | Herramientas, políticas y monitoreo |
| IA no realtime | OpenAI Responses API detrás de AI Gateway | Scoring asistido, feedback y generación controlada |
| Secretos | Google Secret Manager | Claves y rotación |
| Seguridad perimetral | Load Balancer + Cloud Armor | WAF, rate limiting y protección |
| Observabilidad | OpenTelemetry + Cloud Logging/Trace/Monitoring | Métricas, trazas, alertas y auditoría |
| Infraestructura | Terraform | Entornos y cambios revisables |
| Calidad | Vitest/Jest, Playwright, contract tests y evals | Verificación técnica y pedagógica |

### 5.1 Política de versiones

- Usar una versión LTS de Node compatible con el Next.js y NestJS elegidos.
- Fijar versiones exactas en el lockfile.
- Mantener Next.js y React en una línea estable con parches de seguridad.
- Actualizar primero en desarrollo, ejecutar regresión y promover por entornos.
- Los nombres concretos de modelos de IA viven en configuración, nunca en el currículo.
- Cada ejecución registra proveedor, alias lógico, modelo real, snapshot de parámetros y versión de prompt.

### 5.2 Por qué no añadir otro backend

El stack actual ya utiliza PostgreSQL administrado, Identity Platform, Cloud Run y controles de Google Cloud. Añadir otro BaaS crearía dos sistemas de identidad, dos modelos de seguridad y mayor carga operativa. El diseño conserva PostgreSQL portable para poder migrar en el futuro si fuera necesario.

---

## 6. Organización del monorepo

~~~text
star-learning-os/
  apps/
    web/
      src/app/[locale]/
        (student)/learn/[programCode]/
        (family)/family/
        (staff)/studio/
      src/features/
      src/components/
    api/
      src/modules/
        identity/
        family/
        program-catalog/
        curriculum/
        enrollment/
        diagnostic/
        learning/
        voice/
        evidence/
        mastery/
        assessment/
        readiness/
        certification/
        commerce/
        safety/
        audit/
    worker/
      src/jobs/
  packages/
    contracts/
    domain/
    language-pack-sdk/
    ai-gateway/
    observability/
    ui/
    config/
    test-fixtures/
  language-packs/
    english-path/
      manifests/
      gold-sets/
    spanish-path/
      manifests/
      gold-sets/
  infra/
    terraform/
      modules/
      environments/
  docs/
    adr/
    runbooks/
~~~

### 6.1 Reglas de dependencia

- <code>apps/web</code> consume contratos; no importa código interno de la API.
- Los módulos de dominio no importan SDKs de OpenAI ni Google Cloud.
- <code>ai-gateway</code> implementa adaptadores de proveedor.
- <code>language-pack-sdk</code> valida manifests, referencias y compatibilidad.
- <code>curriculum</code> conoce programas y versiones; <code>voice</code> solo consume un contrato resuelto.
- <code>commerce</code> decide entitlement, nunca dominio académico.
- <code>assessment</code> puede leer evidencia; el Tutor no puede aprobarse a sí mismo.
- Toda integración externa está detrás de una interfaz y puede simularse en pruebas.

### 6.2 Next.js

- Server Components por defecto para home, ruta, progreso y catálogo.
- Client Components únicamente donde exista WebRTC, micrófono, animación interactiva o estado inmediato.
- Route Handlers para callbacks, webhooks o streaming que realmente pertenezcan a la capa web.
- La autorización se repite en el backend y en cada lectura sensible; <code>proxy.ts</code> solo sirve para redirecciones gruesas de locale/sesión.
- Currículo publicado puede usar caché con invalidación por versión.
- Progreso, permisos y datos familiares no usan caché compartida.
- El SDK de nube/base de datos se inicializa de forma perezosa en servidor, nunca al importar módulos.

---

## 7. Límites del monolito modular

| Módulo | Dueño de | No debe hacer |
|---|---|---|
| Program Catalog | programas, tracks, versiones y targets | Calcular dominio |
| Curriculum | grafo, unidades, lecciones, activities, rúbricas | Autorizar compras |
| Enrollment | inscripción, ritmo, status y versión fijada | Modificar una versión publicada |
| Diagnostic | blueprint, attempts, placement y confianza | Compartir nivel entre programas |
| Learning | plan diario, STAR Loop y scheduler | Inventar contenido |
| Voice | sesión WebRTC, contexto y tools | Declarar mastery |
| Evidence | artefactos normalizados y provenance | Alterar evidencia original |
| Mastery | estado por competencia e inscripción | Usar solo una nota del Mentor |
| Assessment | checkpoints y scoring controlado | Reutilizar rúbrica de otro idioma |
| Readiness | reglas de salida y objetivo externo | Emitir certificado externo oficial |
| Safety | edad, consentimiento, policies y incidentes | Exponer contenido privado a staff no autorizado |
| Commerce | productos, cuotas y entitlements | Cambiar estándar académico |
| Family | tutores, dependientes y reportes | Mostrar transcripciones completas por defecto |
| Audit | eventos, cambios y usage ledger | Guardar audio crudo |

### 7.1 Motores STAR

Los motores existentes continúan, pero se vuelven multi-programa:

- **StarGraph:** grafo del programa y mappings a frameworks/targets.
- **StarContent:** contenido del <code>program_version</code>.
- **StarEvidence:** evidencia ligada a inscripción, actividad y rúbrica.
- **StarMastery:** dominio por competencia dentro de una inscripción.
- **StarAdapt:** adaptación de apoyo y secuencia dentro del mapa aprobado.
- **StarAssess:** evaluación controlada por idioma y versión.
- **StarProof:** readiness para un <code>qualification_target</code>.
- **StarAudit:** trazabilidad de usuario, IA, contenido y decisiones.

---

## 8. Language Pack: contrato académico-técnico

Un <code>Language Pack</code> no es un archivo de traducción. Es un release académico completo, versionado e inmutable.

### 8.1 Contenido obligatorio

- identidad del programa y versión;
- idioma objetivo, apoyo predeterminado y variedades;
- framework y niveles de entrada/salida;
- grafo de competencias y prerrequisitos;
- unidades, contratos de lección y actividades;
- blueprints de diagnóstico y checkpoints;
- rúbricas, criterios y ejemplos ancla;
- política de inmersión, traducción y code-switching;
- política de pronunciación y variedades aceptadas;
- fragmentos de prompt, herramientas permitidas y límites;
- mapeos a objetivos externos;
- assets y localizaciones;
- gold sets técnicos, pedagógicos y de safety;
- responsables, revisores, checksum y estado de publicación.

### 8.2 Interfaz TypeScript

~~~ts
export interface LanguagePackManifest {
  schemaVersion: "1.0";
  programCode: string;
  programVersion: string;
  status: "draft" | "review" | "published" | "retired";

  targetLanguage: string;
  defaultSupportLanguage: string;
  defaultInterfaceLocale: string;
  targetVariety: string;
  acceptedVarieties: string[];

  audience: {
    minimumAge: number;
    maximumAge?: number;
    markets: string[];
  };

  framework: {
    code: "CEFR";
    sourceVersion: string;
    entryRange: string[];
    exitRange: string[];
  };

  resources: {
    competencyGraph: ResourceRef;
    curriculum: ResourceRef;
    diagnostic: ResourceRef;
    rubrics: ResourceRef;
    languagePolicy: ResourceRef;
    pronunciationPolicy: ResourceRef;
    promptFragments: ResourceRef;
    goldSets: ResourceRef[];
  };

  qualificationTargets: QualificationTargetRef[];
  compatibility: {
    minimumEngineVersion: string;
    maximumEngineVersion?: string;
  };

  governance: {
    academicOwner: string;
    reviewers: string[];
    approvedAt?: string;
    contentHash: string;
  };
}
~~~

### 8.3 Ejemplo de manifest de Spanish Path

~~~json
{
  "schemaVersion": "1.0",
  "programCode": "spanish-path",
  "programVersion": "2026.1-a1-pilot",
  "status": "draft",
  "targetLanguage": "es",
  "defaultSupportLanguage": "en",
  "defaultInterfaceLocale": "en-US",
  "targetVariety": "es-419",
  "acceptedVarieties": ["es-PE", "es-MX", "es-CO", "es-ES"],
  "audience": {
    "minimumAge": 12,
    "markets": ["US", "CA"]
  },
  "framework": {
    "code": "CEFR",
    "sourceVersion": "configured-in-catalog",
    "entryRange": ["PRE-A1", "A1"],
    "exitRange": ["A1"]
  },
  "qualificationTargets": [],
  "compatibility": {
    "minimumEngineVersion": "1.0.0"
  },
  "governance": {
    "academicOwner": "role:spanish-academic-lead",
    "reviewers": ["role:ele-reviewer", "role:safety-reviewer"],
    "contentHash": "sha256:pending"
  }
}
~~~

### 8.4 Pipeline de publicación

~~~mermaid
flowchart LR
  D["Draft"] --> V["Validación de esquema"]
  V --> C["Validación del grafo"]
  C --> G["Gold sets y evals"]
  G --> A["Revisión académica"]
  A --> S["Revisión safety 12+"]
  S --> P["Published inmutable"]
  P --> E["Disponible para nuevas inscripciones"]
  P --> R["Retired, no nuevas inscripciones"]
~~~

El pipeline bloquea:

- referencias huérfanas o ciclos no permitidos;
- competencias sin rúbrica;
- actividades con idioma distinto al programa;
- targets externos sin versión;
- prompts sin policy;
- falta de revisores;
- regresiones en evals;
- assets sin licencia o provenance.

Una inscripción ya iniciada conserva su versión. Migrarla requiere una tabla de equivalencias, simulación, consentimiento si cambia la promesa y un comando explícito.

---

## 9. Modelo de datos PostgreSQL

### 9.1 Esquemas lógicos

| Esquema | Contenido |
|---|---|
| <code>identity</code> | usuarios internos, vínculos con Identity Platform |
| <code>family</code> | hogares, tutores, dependientes y consentimientos |
| <code>catalog</code> | idiomas, variedades, programas, tracks, versiones y targets |
| <code>curriculum</code> | grafo, unidades, lecciones, actividades y rúbricas |
| <code>learning</code> | inscripciones, planes, sesiones, evidencia y mastery |
| <code>assessment</code> | diagnóstico, checkpoints, attempts y readiness |
| <code>ai</code> | prompts, configuraciones, sesiones, model runs y uso |
| <code>safety</code> | policies, incidentes, escalamiento y retención |
| <code>commerce</code> | productos, suscripciones, entitlements y cuotas |
| <code>audit</code> | outbox, audit log y cambios administrativos |

### 9.2 Entidades principales

~~~mermaid
flowchart LR
  USER["User / Guardian"] --> LEARNER["Learner"]
  LEARNER --> ENROLL["Enrollment\nfrontera de progreso"]

  PROGRAM["Language Program"] --> VERSION["Program Version\ninmutable"]
  VERSION --> TRACK["Track / Qualification Target"]
  VERSION --> CURR["Curriculum Version"]
  VERSION --> ENROLL

  CURR --> COMP["Competency Graph"]
  CURR --> LESSON["Lesson Contracts"]
  CURR --> RUBRIC["Rubric Versions"]

  ENROLL --> PLAN["Learning Plan"]
  ENROLL --> STATE["Competency State"]
  ENROLL --> EVID["Evidence"]
  ENROLL --> ATTEMPT["Diagnostic / Assessment"]
  ENROLL --> VOICE["Voice Session"]

  COMP --> STATE
  LESSON --> EVID
  RUBRIC --> EVID
  ATTEMPT --> READY["Readiness Decision"]
  VOICE --> RUN["Model Runs + Usage"]
~~~

### 9.3 Identificadores y tipos

- IDs expuestos: UUIDv7 generado en aplicación y almacenado como <code>uuid</code>.
- Eventos internos de alto volumen: <code>bigint generated always as identity</code>.
- Fechas: <code>timestamptz</code> en UTC.
- Idiomas y estados: <code>text</code> con <code>check</code> o tablas catálogo.
- Puntajes: <code>numeric</code> cuando la precisión académica importa.
- Configuración versionada: <code>jsonb</code> validado, no como sustituto de relaciones principales.
- Dinero: unidad mínima entera y código ISO de moneda.

### 9.4 DDL de referencia

El siguiente DDL define el patrón, no reemplaza las migraciones completas:

~~~sql
create schema if not exists catalog;
create schema if not exists curriculum;
create schema if not exists learning;
create schema if not exists assessment;
create schema if not exists ai;
create schema if not exists audit;

create table catalog.language_programs (
  id uuid primary key,
  code text not null unique,
  name text not null,
  target_language text not null,
  default_support_language text not null,
  default_interface_locale text not null,
  default_target_variety text not null,
  minimum_age smallint not null check (minimum_age >= 0),
  status text not null check (status in ('draft','active','retired')),
  created_at timestamptz not null default now()
);

create table catalog.program_versions (
  id uuid primary key,
  program_id uuid not null references catalog.language_programs(id),
  version text not null,
  engine_min_version text not null,
  status text not null check (status in ('draft','review','published','retired')),
  content_hash text not null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique (program_id, version),
  unique (program_id, id),
  check ((status = 'published' and published_at is not null) or status <> 'published')
);

create index program_versions_program_status_idx
  on catalog.program_versions (program_id, status);

create table catalog.program_tracks (
  id uuid primary key,
  program_version_id uuid not null references catalog.program_versions(id),
  code text not null,
  name text not null,
  qualification_target_id uuid,
  status text not null check (status in ('draft','active','retired')),
  unique (program_version_id, code)
);

create index program_tracks_version_idx
  on catalog.program_tracks (program_version_id);

create table learning.enrollments (
  id uuid primary key,
  learner_id uuid not null,
  program_id uuid not null references catalog.language_programs(id),
  program_version_id uuid not null,
  track_id uuid references catalog.program_tracks(id),
  pace_code text not null check (pace_code in ('flex','accelerated','sprint')),
  support_language text not null,
  interface_locale text not null,
  target_variety text not null,
  status text not null check (status in ('pending_diagnostic','active','paused','completed','cancelled')),
  started_at timestamptz,
  completed_at timestamptz,
  row_version integer not null default 1,
  created_at timestamptz not null default now(),
  foreign key (program_id, program_version_id)
    references catalog.program_versions(program_id, id)
);

create unique index one_active_enrollment_per_program_idx
  on learning.enrollments (learner_id, program_id)
  where status in ('pending_diagnostic','active','paused');

create index enrollments_learner_status_idx
  on learning.enrollments (learner_id, status, created_at desc);

create table learning.competency_states (
  id uuid primary key,
  enrollment_id uuid not null references learning.enrollments(id),
  competency_id uuid not null,
  mastery_score numeric(5,4) not null check (mastery_score between 0 and 1),
  confidence numeric(5,4) not null check (confidence between 0 and 1),
  freshness numeric(5,4) not null check (freshness between 0 and 1),
  evidence_count integer not null default 0 check (evidence_count >= 0),
  last_evidence_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (enrollment_id, competency_id)
);

create index competency_states_enrollment_mastery_idx
  on learning.competency_states (enrollment_id, mastery_score, freshness);

create table learning.evidence (
  id uuid primary key,
  enrollment_id uuid not null references learning.enrollments(id),
  competency_id uuid not null,
  activity_id uuid not null,
  lesson_contract_id uuid not null,
  rubric_version_id uuid not null,
  source_type text not null check (source_type in ('practice','voice','checkpoint','diagnostic','exam_simulation')),
  artifact_uri text,
  normalized_payload jsonb not null,
  score_payload jsonb not null,
  provenance jsonb not null,
  created_at timestamptz not null default now()
);

create index evidence_enrollment_created_idx
  on learning.evidence (enrollment_id, created_at desc);

create index evidence_enrollment_competency_idx
  on learning.evidence (enrollment_id, competency_id, created_at desc);

create table ai.voice_sessions (
  id uuid primary key,
  enrollment_id uuid not null references learning.enrollments(id),
  lesson_contract_id uuid not null,
  provider_call_id text,
  model_alias text not null,
  model_snapshot text not null,
  prompt_version_id uuid not null,
  policy_version_id uuid not null,
  target_language text not null,
  support_language text not null,
  target_variety text not null,
  immersion_ratio numeric(4,3) not null check (immersion_ratio between 0 and 1),
  status text not null check (status in ('created','connected','completed','failed','terminated')),
  started_at timestamptz,
  ended_at timestamptz,
  input_audio_tokens bigint not null default 0,
  output_audio_tokens bigint not null default 0,
  input_text_tokens bigint not null default 0,
  output_text_tokens bigint not null default 0,
  created_at timestamptz not null default now()
);

create index voice_sessions_enrollment_created_idx
  on ai.voice_sessions (enrollment_id, created_at desc);

create table audit.outbox_events (
  sequence_id bigint generated always as identity primary key,
  event_id uuid not null unique,
  aggregate_type text not null,
  aggregate_id uuid not null,
  event_type text not null,
  schema_version integer not null,
  payload jsonb not null,
  occurred_at timestamptz not null,
  published_at timestamptz,
  attempts integer not null default 0
);

create index outbox_unpublished_idx
  on audit.outbox_events (sequence_id)
  where published_at is null;
~~~

### 9.5 Reglas de integridad que deben completar las migraciones

- El <code>track_id</code> debe pertenecer al mismo <code>program_version_id</code> de la inscripción.
- La competencia, actividad, lección y rúbrica de una evidencia deben pertenecer a la versión fijada en la inscripción.
- Una versión publicada no acepta <code>update</code> ni <code>delete</code> de contenido.
- Una decisión de readiness siempre referencia el target y su versión.
- El idioma objetivo de una sesión de voz se deriva del programa; el cliente no puede inventarlo.
- El alumno no puede iniciar una sesión en una inscripción pausada o sin entitlement.
- No se declara mastery si falta el mínimo de evidencia o confianza definido por la rúbrica.

Estas reglas se implementan con constraints cuando sea posible y con funciones de dominio transaccionales cuando crucen varias tablas.

### 9.6 Índices

Toda foreign key utilizada para joins debe tener índice. Además:

- <code>(enrollment_id, status, created_at desc)</code> para sesiones y attempts.
- <code>(enrollment_id, competency_id, created_at desc)</code> para evidencia.
- índice parcial para inscripciones activas.
- índice parcial para outbox no publicado.
- <code>(program_version_id, status)</code> para contenido publicado.
- GIN en <code>jsonb</code> únicamente si existe una consulta real y medida.
- paginación por cursor; evitar <code>OFFSET</code> en historiales grandes.

### 9.7 Transacciones y concurrencia

- Crear evidencia, actualizar mastery y escribir outbox en una sola transacción.
- Usar <code>row_version</code> u otra concurrencia optimista en inscripción/plan.
- Toda operación POST sensible acepta <code>Idempotency-Key</code>.
- Los workers usan claves de deduplicación.
- No mantener una transacción abierta durante una llamada a OpenAI.
- Usar pool de conexiones y límites por servicio compatibles con Cloud SQL.

---

## 10. Identidad, autorización y aislamiento

### 10.1 Flujo de identidad

1. El usuario inicia sesión con Identity Platform.
2. Next.js recibe una sesión segura y <code>httpOnly</code>.
3. La API valida issuer, audience, firma, expiración y revocación.
4. La identidad externa se mapea a un <code>user_id</code> interno.
5. Cada caso de uso carga roles, vínculo familiar y acceso a la inscripción.
6. La autorización se evalúa de nuevo en el backend; nunca se confía en IDs enviados por el navegador.

### 10.2 Roles

| Rol | Acceso |
|---|---|
| Learner | Sus inscripciones, clases, evidencia resumida y progreso |
| Guardian | Dependientes autorizados, consumo, seguridad y reportes apropiados |
| Academic author | Contenido del programa asignado, nunca publicación final |
| Academic reviewer | Revisión y aprobación del programa/idioma asignado |
| Safety reviewer | Incidentes con acceso mínimo y auditado |
| Support | Metadatos operativos; no audio/transcripción completa por defecto |
| Admin | Configuración controlada con MFA y step-up |
| Service | Permisos mínimos por workload |

### 10.3 Seguridad de PostgreSQL

- El navegador nunca se conecta directamente a Cloud SQL.
- La API usa un rol de runtime sin DDL, sin propiedad de tablas y sin <code>BYPASSRLS</code>.
- Migraciones usan una identidad separada.
- El staff no consulta producción con credenciales compartidas.
- Secret Manager entrega credenciales de corta exposición al runtime.
- Registrar actor, propósito, recurso y resultado de accesos administrativos.

RLS puede usarse como defensa adicional en tablas de alto riesgo. Si se usa con pool:

- establecer <code>actor_id</code>, <code>household_id</code> y rol con <code>set_config(..., true)</code> dentro de la transacción;
- nunca usar variables de sesión persistentes;
- mantener pruebas que intenten cruces entre familias e inscripciones;
- no reemplazar con RLS la autorización del dominio.

### 10.4 Regla de aislamiento académico

Cada consulta de aprendizaje comienza por <code>enrollment_id</code> y verifica:

~~~text
actor -> learner/guardian link -> enrollment -> program_version
      -> curriculum/rubric/policy permitidos
~~~

No existe una memoria global del Tutor que mezcle English Path y Spanish Path. Los datos compartibles se limitan a preferencias no lingüísticas autorizadas, como accesibilidad, zona horaria y horario preferido.

---

## 11. API REST

La API se publica en <code>/v1</code>, se documenta con OpenAPI y usa JSON. Los nombres internos de proveedor no forman parte del contrato público.

### 11.1 Catálogo e inscripción

| Método | Ruta | Uso |
|---|---|---|
| GET | <code>/v1/programs</code> | Programas visibles según mercado/edad |
| GET | <code>/v1/programs/{code}</code> | Detalle, tracks y ritmos |
| POST | <code>/v1/enrollments</code> | Crear inscripción |
| GET | <code>/v1/enrollments/{id}</code> | Contexto de ruta |
| PATCH | <code>/v1/enrollments/{id}</code> | Pausar, locale o apoyo permitido |
| POST | <code>/v1/enrollments/{id}/migrations</code> | Migración explícita de versión |

### 11.2 Aprendizaje

| Método | Ruta | Uso |
|---|---|---|
| GET | <code>/v1/enrollments/{id}/today</code> | Plan diario y siguiente acción |
| GET | <code>/v1/enrollments/{id}/path</code> | Mapa y dominio |
| POST | <code>/v1/enrollments/{id}/sessions</code> | Iniciar sesión STAR |
| POST | <code>/v1/sessions/{id}/activities/{activityId}/submissions</code> | Entregar respuesta |
| GET | <code>/v1/enrollments/{id}/progress</code> | Progreso verificable |

### 11.3 Diagnóstico y evaluación

| Método | Ruta | Uso |
|---|---|---|
| POST | <code>/v1/enrollments/{id}/diagnostic-attempts</code> | Crear intento |
| POST | <code>/v1/diagnostic-attempts/{id}/responses</code> | Entregar respuesta |
| POST | <code>/v1/diagnostic-attempts/{id}/complete</code> | Finalizar y ubicar |
| POST | <code>/v1/enrollments/{id}/assessment-attempts</code> | Checkpoint o simulacro |
| GET | <code>/v1/enrollments/{id}/readiness</code> | Estado por target |

### 11.4 Voz

| Método | Ruta | Uso |
|---|---|---|
| POST | <code>/v1/enrollments/{id}/voice-sessions</code> | Autorizar y crear sesión efímera |
| POST | <code>/v1/voice-sessions/{id}/heartbeat</code> | Estado y límites |
| POST | <code>/v1/voice-sessions/{id}/end</code> | Cierre idempotente |
| POST | <code>/v1/voice-sessions/{id}/client-events</code> | Telemetría permitida |

### 11.5 Staff

| Método | Ruta | Uso |
|---|---|---|
| POST | <code>/v1/staff/program-versions</code> | Crear draft |
| POST | <code>/v1/staff/program-versions/{id}/validate</code> | Validar pack |
| POST | <code>/v1/staff/program-versions/{id}/submit-review</code> | Solicitar revisión |
| POST | <code>/v1/staff/program-versions/{id}/publish</code> | Publicar con doble control |
| GET | <code>/v1/staff/program-versions/{id}/coverage</code> | Huecos y gates |

### 11.6 Crear inscripción

~~~json
POST /v1/enrollments
Idempotency-Key: 018f-example

{
  "learnerId": "0190c7d5-4b6a-7d22-8f21-1a2b3c4d5e6f",
  "programCode": "spanish-path",
  "paceCode": "flex",
  "supportLanguage": "en",
  "interfaceLocale": "en-US",
  "targetVariety": "es-419"
}
~~~

~~~json
{
  "id": "0190c7d5-5d16-7b59-96aa-93f755f4ae21",
  "program": {
    "code": "spanish-path",
    "version": "2026.1-a1-pilot",
    "targetLanguage": "es"
  },
  "paceCode": "flex",
  "status": "pending_diagnostic",
  "nextAction": {
    "type": "start_diagnostic",
    "href": "/v1/enrollments/0190c7d5-5d16-7b59-96aa-93f755f4ae21/diagnostic-attempts"
  }
}
~~~

### 11.7 Crear sesión de voz

Solicitud:

~~~json
POST /v1/enrollments/0190.../voice-sessions
Idempotency-Key: 0190-session-example

{
  "lessonContractId": "0190-lesson-example",
  "client": {
    "platform": "web",
    "timezone": "America/Lima",
    "microphonePermission": true
  }
}
~~~

Respuesta al navegador:

~~~json
{
  "voiceSessionId": "0190-voice-example",
  "provider": "openai-realtime",
  "realtimeModelAlias": "realtime_tutor_primary",
  "ephemeralClientSecret": "short-lived-secret",
  "expiresAt": "2026-07-15T20:05:00Z",
  "sessionPolicy": {
    "targetLanguage": "es",
    "supportLanguage": "en",
    "targetVariety": "es-419",
    "acceptedVarieties": ["es-PE", "es-MX", "es-CO", "es-ES"],
    "immersionRatio": 0.7,
    "maxDurationSeconds": 900,
    "translationMode": "on_request_only"
  }
}
~~~

La respuesta nunca contiene la clave estándar de OpenAI, prompt completo, tool secrets ni IDs de otros alumnos.

### 11.8 Errores

~~~json
{
  "error": {
    "code": "VOICE_QUOTA_EXCEEDED",
    "message": "No hay minutos disponibles para esta inscripción.",
    "traceId": "4bf92f3577b34da6a3ce929d0e0e4736",
    "details": {
      "enrollmentId": "0190-voice-example",
      "resetAt": "2026-08-01T05:00:00Z"
    }
  }
}
~~~

No devolver detalles internos, prompts, SQL ni datos de otra persona.

---

## 12. Eventos y trabajos asíncronos

### 12.1 Patrón

1. El caso de uso escribe estado y evento outbox en la misma transacción.
2. El dispatcher lee eventos no publicados.
3. Envía un Cloud Task con clave de deduplicación.
4. El worker procesa, registra resultado y marca publicado.
5. Los reintentos son idempotentes.
6. Después del máximo, se envía a revisión/dead-letter operativa.

### 12.2 Envelope

~~~json
{
  "eventId": "0190-event-example",
  "eventType": "learning.evidence.created",
  "schemaVersion": 1,
  "occurredAt": "2026-07-15T19:30:00Z",
  "aggregate": {
    "type": "enrollment",
    "id": "0190-enrollment-example"
  },
  "context": {
    "programId": "0190-program-example",
    "programVersionId": "0190-version-example",
    "enrollmentId": "0190-enrollment-example",
    "targetLanguage": "es"
  },
  "data": {
    "evidenceId": "0190-evidence-example",
    "competencyId": "0190-competency-example",
    "sourceType": "voice"
  }
}
~~~

### 12.3 Eventos iniciales

- <code>enrollment.created</code>
- <code>diagnostic.completed</code>
- <code>learning.plan.generated</code>
- <code>learning.session.completed</code>
- <code>learning.evidence.created</code>
- <code>mastery.updated</code>
- <code>assessment.submitted</code>
- <code>assessment.scored</code>
- <code>readiness.changed</code>
- <code>voice.session.completed</code>
- <code>voice.quota.consumed</code>
- <code>safety.incident.created</code>
- <code>program.version.published</code>
- <code>certificate.internal.issued</code>

Los eventos no contienen audio, transcript completo, nombre del menor ni email. Se usan IDs internos y clasificación de datos.

---

## 13. Flujo de onboarding y diagnóstico

~~~mermaid
sequenceDiagram
  participant G as Alumno/Tutor
  participant W as Web
  participant A as API
  participant C as Program Catalog
  participant D as Diagnostic
  participant L as Learning

  G->>W: Elige idioma y objetivo
  W->>A: Crear inscripción
  A->>C: Resolver programa/version/track
  C-->>A: Versión publicada compatible
  A-->>W: Enrollment pending_diagnostic
  G->>W: Completa diagnóstico
  W->>D: Respuestas por enrollment
  D->>D: Scoring + confianza + controles
  D->>L: Placement y perfil inicial
  L->>L: Generar plan según ritmo
  L-->>W: Ruta inicial y primera clase
~~~

### 13.1 StarMap por programa

Cada programa mantiene:

- blueprint independiente;
- banco y restricciones de exposición;
- instrucciones localizadas;
- rúbricas de speaking/writing propias;
- scorers calibrados;
- política de ayuda durante el intento;
- resultado por habilidad, confianza y rango;
- reglas para <code>insufficient_evidence</code>;
- auditoría de versión.

Una variedad/acento se registra como condición de observación; no se considera error automáticamente.

### 13.2 Elección de producto en la evaluación inicial

Después de estimar el nivel, el sistema presenta:

- tiempo semanal disponible;
- urgencia y fecha objetivo;
- precio/rango;
- Flex, Accelerated o Sprint compatibles;
- proyección expresada como rango, nunca garantía absoluta.

La recomendación de ritmo no cambia el currículo ni rebaja los gates de dominio.

---

## 14. Flujo de clase diaria

1. <code>GET /today</code> devuelve el siguiente contrato de lección.
2. **Scan:** recuperación corta y detección de estado.
3. **Train:** práctica focalizada según prerequisitos.
4. **Act:** producción oral/escrita o tarea auténtica.
5. **Reinforce:** feedback, repetición espaciada y próximo compromiso.
6. Cada actividad produce evidencia normalizada.
7. StarMastery actualiza dominio solo con las reglas del programa.
8. StarAdapt ordena la próxima práctica dentro del mapa publicado.

### 14.1 Contrato de lección

~~~json
{
  "lessonContractId": "0190-lesson",
  "programVersionId": "0190-spanish-version",
  "unitCode": "ES-A1-U03",
  "targetLanguage": "es",
  "supportLanguage": "en",
  "targetVariety": "es-419",
  "immersionRatio": 0.70,
  "objectives": ["ES-A1-INTERACTION-INTRODUCE-SELF"],
  "allowedActivities": ["retrieval", "guided-dialogue", "roleplay"],
  "mentorMode": "coach",
  "correctionPolicy": "delayed_then_recast",
  "translationPolicy": "on_request_only",
  "evidenceRequirements": {
    "minimumTurns": 6,
    "rubricVersionId": "0190-rubric",
    "requiredCompetencies": ["0190-competency"]
  },
  "timeboxSeconds": 900
}
~~~

El cliente puede mostrar este contrato, pero no modificarlo.

---

## 15. Arquitectura de voz e IA

La clase oral usa una sesión de agente de voz, no una sesión de traducción.

### 15.1 Flujo Realtime

~~~mermaid
sequenceDiagram
  participant B as Navegador
  participant API as STAR API
  participant O as OpenAI Realtime
  participant S as Sideband STAR
  participant T as Tools de dominio

  B->>API: POST voice-session con enrollment
  API->>API: Auth, consentimiento, entitlement, lesson
  API->>O: Crear sesión con clave server-side
  O-->>API: Secret efímero + call_id
  API->>S: Asociar contexto server-side
  S->>O: Conectar sideband al call_id
  API-->>B: Secret efímero y policy pública
  B->>O: WebRTC audio + data channel
  O->>S: Tool request / eventos
  S->>T: Ejecutar herramienta permitida
  T-->>S: Resultado mínimo
  S-->>O: Tool result / update de sesión
  O-->>B: Audio del Mentor
  O->>S: response.done + usage
  S->>API: Uso, estado y eventos permitidos
  B->>API: Cerrar sesión
~~~

### 15.2 Responsabilidades

**Navegador**

- pedir permiso del micrófono;
- crear peer connection WebRTC;
- reproducir audio;
- mostrar estado, mute, subtítulos permitidos y finalización;
- enviar únicamente eventos de cliente aprobados.

**API**

- autenticar y autorizar la inscripción;
- comprobar edad, consentimiento, cuota y contrato;
- crear la sesión con clave server-side;
- devolver un secreto efímero;
- registrar sesión, versión y límites.

**Sideband STAR**

- mantener instrucciones y herramientas privadas;
- validar cada tool call;
- aplicar límites y terminar sesiones;
- registrar usage de <code>response.done</code>;
- detectar eventos de seguridad;
- impedir que el cliente cambie programa o policy.

### 15.3 Prompt compuesto

El prompt se ensambla en servidor con capas versionadas:

1. Constitución global STAR y seguridad 12+.
2. Banda etaria y contexto autorizado.
3. Programa, idioma objetivo y política de variedades.
4. Modo del Mentor.
5. Contrato de lección.
6. Resumen pedagógico mínimo de esa inscripción.
7. Política de corrección e inmersión.
8. Herramientas permitidas y reglas de llamada.
9. Criterios de salida.

Nunca se inserta:

- historial completo de otro programa;
- PII innecesaria;
- transcripciones familiares;
- claves o información del sistema;
- instrucciones editables por el alumno.

### 15.4 Herramientas iniciales

| Tool | Función | Restricción |
|---|---|---|
| <code>get_lesson_state</code> | Estado actual | Solo sesión/enrollment vigente |
| <code>record_observation</code> | Evidencia provisional | No declara mastery |
| <code>request_hint</code> | Hint aprobado | Respeta language policy |
| <code>mark_activity_step</code> | Avance local | Idempotente |
| <code>report_safety_signal</code> | Señal de seguridad | Escalamiento server-side |
| <code>end_session</code> | Cierre seguro | Motivo controlado |

No se expone una herramienta SQL, búsqueda libre de usuarios, escritura curricular ni cambio de notas.

### 15.5 Modelos

- Alias recomendado para piloto: <code>realtime_tutor_primary</code>, resuelto actualmente a un modelo Realtime de calidad alta, como <code>gpt-realtime-2.1</code> mientras sea el modelo aprobado.
- Un modelo mini solo reemplaza al principal cuando supera los mismos evals de calidad, safety, latencia y costo.
- Scoring posterior y generación controlada usan aliases separados.
- <code>gpt-realtime-translate</code>, si se habilita, sirve como intérprete puntual o accesibilidad; no reemplaza al Tutor, el currículo ni la evaluación.
- El nombre del modelo es configuración versionada y puede cambiar sin republicar todo el currículo.

### 15.6 Safety identifier

La API envía <code>OpenAI-Safety-Identifier</code> desde servidor usando un identificador interno estable, pseudónimo y no reversible. No se usa nombre, email ni teléfono del alumno.

### 15.7 Memoria

Se guardan hechos pedagógicos estructurados, por ejemplo:

~~~json
{
  "enrollmentId": "0190-enrollment",
  "competencyId": "0190-competency",
  "observation": "needs_support",
  "errorCategory": "ser_estar_selection",
  "confidence": 0.78,
  "sourceEvidenceId": "0190-evidence",
  "expiresOrReviewAt": "2026-08-15T00:00:00Z"
}
~~~

No se guarda “todo lo que dijo el estudiante” como memoria.

### 15.8 Evaluación separada

El Mentor puede entregar feedback formativo, pero no es la única fuente de una nota. Speaking/Writing evaluables siguen este pipeline:

1. evidencia autorizada;
2. normalización;
3. scoring con rúbrica versionada;
4. controles determinísticos;
5. calibración y confianza;
6. revisión humana cuando la confianza es baja, hay high stakes o existe apelación;
7. decisión de dominio/readiness auditada.

---

## 16. Frontend y experiencia

### 16.1 Rutas

~~~text
/{locale}/learn/{programCode}/home
/{locale}/learn/{programCode}/diagnostic
/{locale}/learn/{programCode}/today
/{locale}/learn/{programCode}/voice/{sessionId}
/{locale}/learn/{programCode}/path
/{locale}/learn/{programCode}/progress
/{locale}/family
/{locale}/studio/programs/{programCode}
~~~

Ejemplos:

- <code>/es-PE/learn/english-path/today</code>
- <code>/en-US/learn/spanish-path/today</code>

### 16.2 Selector de programa

Si existe más de una inscripción:

- la home muestra tarjetas independientes;
- cada tarjeta muestra idioma, versión, ritmo, progreso y siguiente acción;
- cambiar de programa termina cualquier sesión de voz activa;
- la URL siempre conserva <code>programCode</code>;
- el servidor verifica que la inscripción corresponde al programa de la URL.

### 16.3 Responsive

**Mobile**

- navegación inferior con Inicio, Hoy, Mentor y Progreso;
- botón de voz grande y estados claros;
- textos cortos y controles táctiles de al menos 44 px;
- reconexión y modo de red débil;
- no depender de hover.

**Escritorio**

- navegación lateral;
- mapa y panel de evidencia en dos columnas;
- sesión de Mentor con objetivos y notas al costado;
- Curriculum Studio con tablas, cobertura y diff de versión.

### 16.4 Accesibilidad

- WCAG 2.2 AA como objetivo.
- Navegación completa por teclado.
- Focus visible.
- Subtítulos configurables cuando la policy lo permita.
- Reducción de movimiento.
- Contraste y estados no dependientes solo del color.
- Alternativas a actividades exclusivamente auditivas.
- Controles de velocidad o repetición cuando no invaliden la evaluación.

### 16.5 Localización

La UI usa catálogos por locale. El contenido curricular se resuelve desde el Language Pack. Son pipelines distintos:

~~~text
UI copy -> localization catalog -> interface locale
Lesson content -> program version -> target/support language policy
~~~

Traducir botones no crea un programa académico.

---

## 17. Backoffice multi-programa

Curriculum Studio debe incluir:

- selector obligatorio de programa y versión;
- permisos por idioma y rol;
- editor de grafo y prerrequisitos;
- coverage map de competencias, lecciones, rúbricas y assessments;
- diff entre versiones;
- gestión de variedades y ejemplos aceptados;
- mapeos CEFR/TOEFL/DELE/SIELE versionados;
- edición separada de localización UI;
- previsualización del Mentor por edad/nivel;
- corrida de gold sets;
- revisión dual y publicación;
- historial inmutable.

### 17.1 Separación de funciones

| Acción | Autor | Revisor | Publicador |
|---|---|---|---|
| Crear contenido | Sí | Puede comentar | No necesario |
| Modificar draft | Sí | Según permiso | No |
| Aprobar academicamente | No sobre su propio cambio | Sí | No |
| Aprobar safety | No | Safety reviewer | No |
| Publicar | No | No | Rol release con gates |

Para cambios de alto impacto se exige doble control y MFA.

### 17.2 Equipo mínimo Spanish Path

- especialista en ELE/adquisición del español;
- responsable curricular alineado con CEFR/PCIC;
- especialista del examen elegido;
- revisores de speaking y writing;
- responsable de variedades y sesgo lingüístico;
- safety reviewer bilingüe.

---

## 18. Comercio, cuotas y rentabilidad

### 18.1 Unidad comercial

La suscripción produce entitlements por inscripción:

~~~text
household subscription
  -> learner entitlement
    -> enrollment entitlement
      -> pace + voice minutes + assessments + support
~~~

Recomendación: los minutos de voz se asignan por inscripción. Un bundle familiar puede permitir transferencias controladas, pero Spanish Path no debe consumir silenciosamente el saldo de English Path.

### 18.2 Ledger de uso

Registrar por sesión:

- programa, track, ritmo y enrollment;
- alias/modelo real;
- tokens de audio/texto de entrada/salida;
- duración conectada y tiempo activo;
- prompt cache hit cuando esté disponible;
- tools ejecutadas;
- costo calculado con la tabla de precios vigente;
- margen estimado por plan.

La tabla de precios es configuración efectiva por fecha. Nunca se codifican montos permanentes en el frontend.

### 18.3 Fórmula

~~~text
costo_variable_sesion =
  input_audio_tokens  × tarifa_input_audio
+ output_audio_tokens × tarifa_output_audio
+ input_text_tokens   × tarifa_input_text
+ output_text_tokens  × tarifa_output_text
+ scoring_post_sesion
+ almacenamiento_permitido
+ tareas_async
~~~

La documentación oficial de Realtime indica que el audio de entrada equivale aproximadamente a un token por 100 ms y el de salida a un token por 50 ms. El ledger debe usar el usage real de <code>response.done</code>, no solo una estimación por minutos.

### 18.4 Controles de costo

- límite duro por sesión;
- quota diaria y mensual por enrollment;
- aviso al 70%, 90% y 100%;
- finalizar sesiones abandonadas;
- resumir contexto y truncar de forma pedagógicamente segura;
- aprovechar prompt caching;
- no enviar historial irrelevante;
- comparar modelo mini solo con evals aprobados;
- alertas por costo por alumno y margen por plan.

---

## 19. Menores, privacidad y seguridad

### 19.1 Edad y consentimiento

Para +12 se necesita una política por mercado:

- fecha de nacimiento o banda etaria verificada de forma proporcional;
- consentimiento del tutor cuando corresponde;
- registro versionado de términos y privacy notice;
- revocación y cierre de cuenta;
- controles adicionales si el usuario está por debajo de la edad de consentimiento digital aplicable;
- Zero Data Retention con el proveedor cuando sea requerido para datos de menores.

No se debe asumir que “+12” resuelve todas las jurisdicciones. En particular, los mercados de ejemplo del manifest de Spanish Path (US y CA) exigen revisión previa de COPPA y de las leyes estatales/provinciales aplicables antes de habilitar menores; es un gate legal equivalente a la revisión peruana de English Path.

### 19.2 Política de audio

Por defecto:

- transmitir para la sesión;
- obtener métricas/artefactos mínimos;
- no persistir audio crudo;
- no permitir reproducción por staff;
- no usarlo para entrenamiento propio.

Una muestra para QA solo puede guardarse cuando existe:

- propósito explícito;
- consentimiento correspondiente;
- muestreo mínimo;
- cifrado;
- acceso restringido y auditado;
- fecha automática de eliminación.

### 19.3 Clasificación y retención

| Dato | Clase | Retención recomendada |
|---|---|---|
| Perfil/guardian link | Restringido | Mientras exista relación + obligación legal |
| Consentimiento | Legal/restringido | Según obligación y defensa contractual |
| Progreso/mastery | Académico | Vida de cuenta + ventana de exportación |
| Evidencia estructurada | Académico sensible | Según promesa y política |
| Audio crudo | Altamente sensible | 0 por defecto |
| Transcript QA consentido | Altamente sensible | Ventana corta, borrado automático |
| Usage/costo | Operativo | Agregado largo; detalle mínimo |
| Audit log | Seguridad | Inmutable por ventana definida |

La cifra exacta se decide con asesoría legal por mercado.

### 19.4 Safety Gateway

- filtros de entrada/salida apropiados para edad;
- prompt-injection y tool abuse controls;
- temas prohibidos y redirección;
- detección de autolesión, abuso o peligro;
- respuesta de emergencia localizada;
- escalamiento humano definido;
- rate limiting y bloqueo adaptativo;
- no mantener conversaciones secretas con menores;
- herramientas allowlist y argumentos validados.

### 19.5 Seguridad de aplicación

- TLS y cifrado en reposo.
- WAF, rate limits y protección de bots.
- CSP, cookies seguras, CSRF donde corresponda.
- Validación de uploads, tipo, tamaño y malware.
- Dependencias escaneadas y SBOM.
- Secrets fuera de repositorio y rotados.
- Backups, PITR y prueba de restauración.
- MFA/step-up para staff.
- Logs sin PII, tokens ni secretos.
- Pentest antes de una apertura amplia.

---

## 20. Observabilidad y SLO

### 20.1 Tres tableros

**Técnico**

- disponibilidad, p50/p95/p99;
- errores por endpoint;
- tiempo de conexión WebRTC y dropout;
- fallos de tool calls;
- conexiones PostgreSQL;
- retraso outbox/Cloud Tasks;
- versión desplegada.

**Académico**

- completion por programa, nivel y ritmo;
- evidencia válida por competencia;
- mastery y freshness;
- acuerdo IA–revisor humano;
- placement drift;
- readiness y resultados externos cuando el alumno los comparte;
- regresiones por prompt/program version.

**Negocio y safety**

- activación, conversión y retención;
- voz consumida y margen por plan;
- incidentes por 1,000 sesiones;
- falsos positivos/negativos;
- tiempo de resolución;
- consentimiento y borrado.

### 20.2 SLO iniciales

| Indicador | Objetivo piloto |
|---|---|
| Disponibilidad de clase no-voz | 99.5% mensual en piloto; 99.9% tras estabilización (alineado con Especificación §18) |
| Creación de sesión de voz | 99.5% excluyendo permisos/dispositivo |
| Latencia API p95 no-IA | < 500 ms |
| Conexión inicial de voz p95 | Medir y fijar tras prueba regional; objetivo < 5 s (alineado con Stack §14.2) |
| Procesamiento de evidencia p95 | < 2 min |
| Eventos outbox sin publicar | 0 fuera de la ventana operativa |
| Mezcla de progreso entre programas | 0 tolerancia |
| Exposición de audio sin consentimiento | 0 tolerancia |

### 20.3 Correlación

Cada request/job/model run incluye:

- <code>trace_id</code>;
- <code>request_id</code>;
- actor pseudónimo;
- <code>enrollment_id</code>;
- <code>program_version_id</code>;
- <code>lesson_contract_id</code>;
- alias y snapshot del modelo;
- prompt/policy version;
- región y versión del servicio.

No se incluyen secretos ni texto completo del alumno en logs.

---

## 21. Pruebas y evaluaciones

### 21.1 Pirámide

| Capa | Qué verifica |
|---|---|
| Unitarias | Reglas de dominio, horarios, cuotas, mastery |
| Propiedad | Grafos, invariantes, idempotencia |
| Integración | PostgreSQL, outbox, storage y auth |
| Contrato | OpenAPI, eventos y Language Pack schema |
| E2E | Enrollment→diagnóstico→plan→lección→evidencia→mastery |
| Browser/dispositivo | WebRTC, permisos, reconexión y responsive |
| IA evals | Calidad, adherence, safety, variantes y costo |
| Seguridad | Cruce de familias, roles, uploads, prompt/tool abuse |
| Restauración | Backups y rollback |

### 21.2 Matriz de evals del Mentor

~~~text
programa × versión × idioma × nivel × edad × variedad
× modo × tipo de actividad × condición de red × safety case
~~~

Incluir:

- español latinoamericano y peninsular;
- inglés con distintos acentos;
- code-switching esperado e indebido;
- alumno silencioso, nervioso, hostil o fuera de tema;
- mala pronunciación y ruido;
- solicitud de traducción;
- prompt injection;
- intento de cambiar nota/objetivo;
- señal de seguridad;
- desconexión y reanudación.

### 21.3 Gates de Language Pack

Antes de publicar:

- 100% de archivos validan esquema;
- 0 referencias huérfanas;
- 0 ciclos inválidos;
- 100% de competencias del corte tienen rúbrica;
- 100% de lecciones tienen contrato y evidence requirements;
- adherence del Mentor ≥ 95% en gold set;
- corrección académica experta ≥ 90% o umbral más estricto por tipo;
- safety sin fallos críticos;
- acuerdo IA–humano dentro del límite definido;
- costo p95 dentro de presupuesto;
- rollback probado.

### 21.4 Prueba de no contaminación

Caso obligatorio:

1. Crear un alumno con English Path y Spanish Path.
2. Obtener mastery alto en una competencia inglesa.
3. Abrir Spanish Path.
4. Verificar que nivel, historial, memoria, cuota, prompt y rúbrica sean españoles.
5. Producir evidencia española.
6. Verificar que English Path no cambie.
7. Repetir con guardian, staff y exportación de datos.

---

## 22. CI/CD, entornos y feature flags

### 22.1 Entornos

| Entorno | Datos | IA | Uso |
|---|---|---|---|
| Local | Sintéticos | Mock o cuenta dev limitada | Desarrollo |
| Preview | Sintéticos | Mock/limitado | Pull request |
| Development | No producción | Cuenta dev | Integración |
| Staging | Cohorte sintética/consentida | Config cercana a prod | Gates |
| Production | Reales | Cuenta prod | Usuarios |

Nunca copiar datos de menores de producción a desarrollo.

### 22.2 Pipeline de código

1. Lint, typecheck y unit tests.
2. Contract y schema tests.
3. Build reproducible.
4. Integración con PostgreSQL efímero.
5. E2E web/API.
6. Evals rápidas.
7. Imagen firmada y escaneada.
8. Terraform plan revisado.
9. Deploy a staging.
10. Smoke, migración y evals completas.
11. Promoción gradual a producción.
12. Monitoreo y rollback automático/manual.

### 22.3 Migraciones

- Expand/contract para cambios compatibles.
- No borrar columna en el mismo release que deja de usarla.
- Backfill idempotente y observable.
- Dry-run de migración sobre una copia segura.
- PITR y restore test antes de cambios de alto riesgo.
- Currículo y código tienen releases independientes, pero compatibilidad explícita.

### 22.4 Feature flags

Flags evaluables por:

- entorno;
- organización/mercado;
- programa y versión;
- cohort;
- enrollment;
- edad;
- porcentaje gradual.

Flags mínimas:

- <code>spanish_path_catalog_visible</code>
- <code>spanish_path_enrollment_enabled</code>
- <code>spanish_path_voice_enabled</code>
- <code>spanish_path_assessment_enabled</code>
- <code>realtime_model_mini_experiment</code>
- <code>audio_qa_consent_flow</code>

Spanish Path empieza apagado en producción. Un kill switch debe detener nuevas sesiones sin afectar acceso a datos y progreso.

---

## 23. Roadmap de construcción

El trabajo se divide en English Launch y Multilingual Foundation. Durante la primera etapa se recomienda 75–80% de capacidad para el MVP de inglés y 20–25% para la base multi-programa.

### Fase 0 — Límites y ADRs (1–2 semanas)

- aprobar este documento;
- resolver decisiones pendientes;
- crear ADRs;
- inventario de tablas/endpoints acoplados a inglés;
- contract tests de estado actual;
- threat model 12+ y data map.

**Salida:** alcance, responsables y backlog estimable.

### Fase 1 — Núcleo multilingual-ready (3–5 semanas)

- Program Catalog y versiones;
- enrollment como contexto obligatorio;
- separación de cuatro idiomas;
- rutas <code>[locale]/learn/[programCode]</code>;
- Language Pack SDK y validador;
- voice session contract;
- telemetry segmentada;
- migración del contenido existente a English Path.

**Salida:** inglés funciona igual sobre el nuevo núcleo; Spanish Path aún oculto.

### Fase 2 — Corte vertical Spanish A1 (4–6 semanas)

- manifest piloto;
- grafo pequeño A1;
- diagnóstico corto;
- 1 unidad completa;
- rúbricas speaking/writing;
- prompt/policy española;
- gold sets y Curriculum Studio mínimo.

**Salida:** flujo completo interno, no venta pública.

### Fase 3 — Alpha interna y dispositivos (3–4 semanas)

- pruebas bilingües;
- calibración humana;
- WebRTC en teléfonos y laptops objetivo;
- safety/code-switching;
- costos y observabilidad;
- corrección de regresiones de inglés.

**Salida:** gates técnicos y académicos de alpha.

### Fase 4 — Beta cerrada (6–8 semanas)

- 30–50 alumnos;
- consentimiento y soporte;
- feature flags por cohort;
- medición de aprendizaje, retención y costo;
- revisión semanal de incidentes;
- sin promesa de certificación externa todavía.

**Salida:** evidencia para decidir ampliación.

### Fase 5 — Piloto de eficacia (8–12 semanas)

- cohorte y criterios definidos;
- pre/post test;
- comparación con evaluadores humanos;
- resultados por variedad, edad y nivel;
- validación del ritmo y margen.

**Salida:** decisión go/no-go para comercializar Spanish Path.

### Fase 6 — Lanzamiento gradual

- target externo seleccionado y validado;
- contenido con cobertura suficiente;
- operaciones y escalamiento listos;
- rollout por mercado;
- monitoreo y rollback;
- publicación transparente de la promesa.

### 23.1 Criterios de go/no-go

**Go**

- ningún P0/P1 abierto;
- 0 contaminación entre programas;
- inglés dentro del presupuesto de regresión;
- adherence española ≥ 95%;
- validación experta ≥ 90%;
- safety y privacidad aprobados;
- costo/margen dentro de límite;
- rollback probado;
- equipo académico responsable disponible.

**No-go**

- currículo español traducido sin validación ELE;
- audio almacenado sin flujo de consentimiento;
- sesiones que pueden cambiar de programa desde cliente;
- baja confianza presentada como nota final;
- rentabilidad basada solo en precio teórico;
- lanzamiento simultáneo que bloquea English Path.

---

## 24. Migración desde los documentos actuales

> **Nota de arranque en verde:** si la construcción comienza sobre esta especificación antes de que exista una plataforma con datos reales, no hay tablas, endpoints ni inscripciones que migrar: el esquema multi-programa (`program_id`, `program_version_id`, `enrollment_id`) se implementa desde la primera migración. La sección 24.4 y el Epic B aplican únicamente si existiera un sistema previo en producción.

### 24.1 Mantener en el núcleo

- STAR Loop.
- StarEvidence, StarMastery, StarAdapt y StarAudit.
- Tutor/Examiner separado.
- arquitectura híbrida de voz y evaluación.
- stack Google Cloud.
- protección juvenil y participación familiar.
- Flex, Accelerated y Sprint.

### 24.2 Mover a English Path

- meta TOEFL 4.5/B2;
- B1→B2 del MVP;
- Starbiz Global B2;
- tareas y simulacros TOEFL;
- readiness TOEFL;
- horarios y estimaciones actuales;
- gold sets específicos de inglés.

### 24.3 Generalizar

| Antes | Después |
|---|---|
| Academia digital de inglés | Academia digital de idiomas |
| Meta TOEFL global | Meta verificable por programa |
| Todos recorren el mismo mapa | Todos en el mismo programa/version recorren el mismo mapa |
| <code>Ready TOEFL</code> | <code>qualification_ready</code> + target |
| Interfaz ES e inmersión EN | locale, target, support y variety separados |
| Nivel del usuario | Estado por enrollment y competency |
| Un prompt de Mentor | Capas globales + Language Pack + lección |
| Traducciones en backoffice | UI localization separada de authoring curricular |

### 24.4 Orden de migración de datos

1. Crear programas y <code>English Path</code>.
2. Crear una <code>program_version</code> para el currículo vigente.
3. Asociar currículo, rúbricas y targets a esa versión.
4. Añadir <code>program_version_id</code> a enrollments.
5. Backfill y verificar conteos.
6. Hacer <code>enrollment_id</code> obligatorio en evidencia/mastery/assessment.
7. Añadir constraints e índices.
8. Actualizar APIs y eventos.
9. Ejecutar E2E y no-contamination tests.
10. Habilitar el esqueleto de Spanish Path solo en development.

---

## 25. ADRs aprobados por esta especificación

### ADR-M001 — Un núcleo, múltiples programas

**Decisión:** English Path y Spanish Path comparten código e infraestructura, pero cada uno publica un Language Pack independiente.  
**Motivo:** reduce duplicación y conserva separación académica.

### ADR-M002 — Locale no es target language

**Decisión:** interfaz, apoyo, objetivo y variedad son campos distintos.  
**Motivo:** permite combinaciones reales y evita acoplar UX con currículo.

### ADR-M003 — Progreso por inscripción

**Decisión:** evidencia, mastery, plan, assessment, voz y readiness se particionan lógicamente por <code>enrollment_id</code>.  
**Motivo:** elimina contaminación entre programas.

### ADR-M004 — Versiones publicadas inmutables

**Decisión:** una inscripción fija <code>program_version_id</code>; migrar es explícito.  
**Motivo:** reproducibilidad, auditoría y promesa consistente.

### ADR-M005 — Google Cloud permanece como fuente de verdad

**Decisión:** Cloud SQL, Cloud Run, Storage, Tasks, Identity Platform y observabilidad GCP continúan.  
**Motivo:** el stack existente es suficiente y evita duplicidad operacional.

### ADR-M006 — Realtime agent para enseñar

**Decisión:** la clase usa un agente Realtime con herramientas y sideband; Realtime Translate solo es apoyo opcional.  
**Motivo:** enseñar exige objetivos, feedback, memoria y evidencia, no traducción literal.

### ADR-M007 — Inglés conserva prioridad

**Decisión:** la base se vuelve multi-programa ahora; Spanish Path se libera detrás de flags y gates.  
**Motivo:** ampliar producto sin poner en riesgo el MVP de inglés.

### ADR-M008 — Audio no persistido por defecto

**Decisión:** audio crudo se descarta tras la sesión; QA requiere consentimiento y retención corta.  
**Motivo:** minimización de datos de menores.

### ADR-M009 — Proveedor de IA detrás de aliases

**Decisión:** currículo y contratos usan aliases lógicos, no nombres fijos de modelos.  
**Motivo:** actualizar modelos sin reescribir metodología ni APIs.

### ADR-M010 — Objetivos externos como adaptadores

**Decisión:** TOEFL, DELE y SIELE son <code>qualification_targets</code> versionados.  
**Motivo:** el núcleo mide dominio; cada examen tiene blueprint y reglas propias.

---

## 26. Decisiones que Henry y el equipo deben cerrar

Estas decisiones no bloquean la arquitectura; sí bloquean el alcance comercial de Spanish Path.

| # | Decisión | Default recomendado |
|---:|---|---|
| 1 | Mercado inicial de Spanish Path | Jóvenes +12 angloparlantes en un mercado controlado |
| 2 | Primer corte | A1 completo o A1.1→A1.2 |
| 3 | Variedad principal | Español latinoamericano neutral <code>es-419</code> |
| 4 | Variedades aceptadas | Política inclusiva validada por expertos |
| 5 | Idioma de apoyo | Inglés |
| 6 | Objetivo externo | No prometerlo en alpha; evaluar DELE/SIELE para fase posterior |
| 7 | Cursar ambos idiomas | Sí, con enrollments separados |
| 8 | Voz | Quota por inscripción |
| 9 | Audio QA | Apagado por defecto |
| 10 | Beta | 30–50 alumnos, feature flag |
| 11 | Equipo académico | Nombrar lead ELE antes de publicar |
| 12 | Nivel transferible | Ninguno entre idiomas en MVP |

---

## 27. Backlog técnico inicial

### Epic A — Program Catalog

- tablas de programas, versiones, tracks y targets;
- servicio de resolución por mercado/edad;
- endpoint catálogo;
- publicación inmutable;
- flags.

### Epic B — Enrollment Context

- migrar inscripciones actuales;
- scope obligatorio en services/repositories;
- guardar locale/support/variety/pace;
- tests de autorización y contaminación.

### Epic C — Language Pack SDK

- JSON Schema;
- CLI de validación;
- graph/rubric/reference checks;
- content hash;
- compatibility gate;
- fixtures de inglés/español.

### Epic D — Voice Gateway

- endpoint efímero;
- WebRTC client;
- sideband;
- prompt composer;
- tools allowlist;
- usage ledger;
- disconnect/kill switch.

### Epic E — Currículo y evaluación

- graph genérico;
- diagnóstico por versión;
- evidence/mastery por enrollment;
- targets externos;
- reviewer workflow.

### Epic F — Safety 12+

- age/consent policy engine;
- data retention;
- incident workflow;
- guardian experience;
- ZDR configuration;
- adversarial evals.

### Epic G — Spanish A1 vertical

- manifest;
- 1 unidad end-to-end;
- diagnóstico;
- prompts y rubrics;
- gold sets;
- alpha interna.

### Epic H — Operación

- dashboards;
- alertas;
- backups/restore;
- CI/CD;
- runbooks;
- costos por enrollment.

---

## 28. Definition of Done del núcleo multilingüe

El núcleo se considera listo cuando:

- English Path corre sobre Program Catalog sin regresión crítica.
- Spanish Path puede registrarse sin crear otra app o tabla paralela.
- Un usuario puede tener dos enrollments simultáneos.
- Todo progreso, evidencia, voz y assessment se resuelve por enrollment.
- Language Pack inválido no puede publicarse.
- Una versión publicada no puede mutar.
- UI locale y target language pueden ser diferentes.
- El navegador recibe solo credenciales efímeras de Realtime.
- Sideband controla tools y policy.
- El Tutor no declara mastery ni readiness por sí solo.
- Raw audio no se almacena por defecto.
- Feature flags permiten apagar Spanish Path y voz.
- Costos se atribuyen a programa, modelo, plan y enrollment.
- Logs y traces permiten reconstruir una decisión sin exponer PII.
- Pruebas de cruce de familias y programas pasan.
- Restore y rollback están probados.
- Existe owner académico para cada programa publicado.

---

## 29. Fuentes oficiales y referencias

### OpenAI

- [Realtime API con WebRTC](https://developers.openai.com/api/docs/guides/realtime-webrtc)
- [Controles server-side y sideband](https://developers.openai.com/api/docs/guides/realtime-server-controls)
- [Costos de Realtime](https://developers.openai.com/api/docs/guides/realtime-costs)
- [Prompting para modelos Realtime](https://developers.openai.com/api/docs/guides/realtime-models-prompting)
- [Traducción Realtime](https://developers.openai.com/api/docs/guides/realtime-translation)
- [Guía API para menores de 18 años](https://developers.openai.com/api/docs/guides/safety-checks/under-18-api-guidance)

### Tecnología

- [Next.js App Router](https://nextjs.org/docs/app)
- [NestJS](https://docs.nestjs.com/)
- [PostgreSQL 17](https://www.postgresql.org/docs/17/)
- [Cloud SQL for PostgreSQL](https://cloud.google.com/sql/docs/postgres)
- [Cloud Run](https://cloud.google.com/run/docs)
- [Cloud Tasks](https://cloud.google.com/tasks/docs)
- [Identity Platform](https://cloud.google.com/identity-platform/docs)
- [OpenTelemetry](https://opentelemetry.io/docs/)
- [Terraform Google provider](https://registry.terraform.io/providers/hashicorp/google/latest/docs)

### Marco académico

- [CEFR Companion Volume](https://www.coe.int/en/web/common-european-framework-reference-languages)
- [Plan Curricular del Instituto Cervantes](https://cvc.cervantes.es/ensenanza/biblioteca_ele/plan_curricular/)
- [Diplomas DELE](https://examenes.cervantes.es/es/dele/que-es)
- [SIELE](https://siele.org/)
- [TOEFL iBT](https://www.ets.org/toefl/test-takers/ibt/about.html)

---

## 30. Conclusión

La integración de español es viable y estratégica siempre que STAR se convierta en un sistema multi-programa, no en un producto de inglés con textos traducidos.

La plataforma debe mantener un núcleo común para identidad, familias, comercio, STAR Loop, voz, evidencia, observabilidad y seguridad; y debe exigir paquetes académicos independientes para cada idioma. La inscripción y la versión publicada son las fronteras que garantizan calidad, trazabilidad y crecimiento.

Con esta estructura, StarbizAcademy puede lanzar English Path primero, construir Spanish Path de forma controlada y añadir futuros idiomas sin duplicar la plataforma ni rebajar la promesa académica.
