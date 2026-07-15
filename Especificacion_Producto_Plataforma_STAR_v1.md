# Especificación de Producto y Plataforma STAR

**Empresa:** StarbizAcademy  
**Versión:** 1.1  
**Fecha:** 14 de julio de 2026  
**Estado:** plano maestro para validación directiva, diseño UX, arquitectura técnica y planificación del MVP  
**Documento académico relacionado:** Metodología STAR Mastery v1.5  
**Arquitectura relacionada:** Stack Tecnológico STAR Learning OS 12+ v1.0

---

## 0. Propósito de este documento

La metodología STAR Mastery define qué debe aprender el alumno y bajo qué principios. Este documento define cómo debe comportarse la plataforma para convertir esa metodología en un producto construible, medible y auditable.

Debe servir como fuente común para:

- Dirección y negocio.
- Diseño de experiencia.
- Equipo académico y psicometría.
- Desarrollo de software.
- IA y datos.
- Soporte, privacidad y operaciones.
- Pruebas y control de calidad.

Este documento no reemplaza:

- El temario detallado de B1 a B2.
- El banco de actividades e ítems.
- Las rúbricas completas.
- El estudio psicométrico.
- Los términos comerciales.
- La política de privacidad y los contratos.
- La revisión legal peruana.

### Regla constitucional

> El Mentor IA puede explicar, conversar, adaptar el apoyo y elegir entre actividades aprobadas. No puede inventar el currículo, alterar evidencias, acceder a respuestas seguras ni declarar dominio, promoción o readiness por sí mismo.

---

## 1. Definición ejecutiva del producto

### 1.1 Qué es StarbizAcademy

StarbizAcademy será una academia digital de inglés impartida cotidianamente por un Mentor IA, con un currículo propio, aprendizaje por dominio y una meta externa verificable.

La propuesta central es:

> Una academia personal para cada alumno, con una ruta medible desde su nivel real hasta la preparación demostrable para TOEFL iBT 4.5/B2.

### 1.2 Qué no es

- No es un chat abierto con un personaje de profesor.
- No es una biblioteca de videos.
- No es una aplicación de rachas y puntos sin resultado final.
- No es un simulador que enseña únicamente trucos de examen.
- No es una certificación TOEFL oficial.
- No es una promesa de tiempo idéntica para todos los niveles.

### 1.3 Promesa inicial correcta

> StarbizAcademy desarrolla tu inglés desde tu nivel actual y te prepara para alcanzar la meta TOEFL iBT 4.5/B2 mediante una ruta personalizada, práctica con IA, evaluación continua y estándares de dominio verificables.

El reporte oficial TOEFL lo emite ETS. Starbiz podrá emitir un certificado propio de culminación y, por separado, una declaración interna de readiness.

### 1.4 Decisiones ya asumidas

| Tema | Decisión de producto |
|---|---|
| Meta principal | TOEFL iBT 4.5/B2 |
| Piso interno propuesto | 4.0 por sección |
| Enseñanza cotidiana | 100% mediante Mentor IA |
| Gobierno académico | Humano y situado detrás del producto |
| Ritmos | Flex, Accelerated y Sprint |
| Calidad | Misma metodología y estándar; cambia la intensidad |
| Voz | Minutos incluidos y medidos; no ilimitada |
| Evaluación | Separada del modo Tutor |
| Público juvenil | Producto diseñado para 12–17, con variantes 12–13 y 14–17 |
| Familia | Todo menor se vincula a un apoderado; pago y decisiones comerciales pertenecen al adulto |
| Protección | ZDR, consentimiento verificable, safeguarding y revisión humana son gates de lanzamiento |

### 1.5 Supuestos de trabajo que Henry debe confirmar

La versión 1.1 se diseña bajo estos supuestos:

- Producto juvenil principal para alumnos de 12 a 17 años; el flujo 18+ permanece separado.
- Bandas operativas 12–13 y 14–17, con transición de cuenta al cumplir 18.
- Todo menor tendrá un apoderado vinculado y una identidad distinta.
- Mercado inicial: Perú, interfaz principal en español.
- Primer tramo comercial completo: B1 a B2.
- Plataforma web adaptable y PWA; sin aplicación nativa en el MVP.
- TOEFL oficial pagado y reservado por el alumno.
- StarMap Preview gratuito y StarMap 360 incluido al activar el programa.
- Los tres ritmos pueden existir comercialmente, pero el piloto se concentra en Accelerated.
- La práctica diaria puede ser dirigida por IA; placement definitivo, promociones, integridad, readiness y certificado de menores requieren revisión pedagógica humana.
- Audio de práctica juvenil no se guarda por defecto.
- Alumnos de 12–13 no usan OpenAI en producción hasta que Starbiz tenga Zero Data Retention aprobado y verificado.

---

## 2. Principios obligatorios de diseño

1. **Un destino común, velocidades distintas.** El plan cambia la carga semanal, no el estándar final.
2. **Dominio antes que avance.** Completar una pantalla o consumir tiempo no acredita aprendizaje.
3. **Una identidad visible, funciones internas separadas.** El alumno conoce a un solo Mentor STAR; Tutor y Examiner tienen permisos distintos.
4. **IA dentro de un sistema.** El modelo conversa; el currículo, el estado y las decisiones viven en servicios controlados.
5. **Explicabilidad.** Todo nivel, recomendación y promoción debe señalar sus evidencias.
6. **Transferencia y retención.** El alumno debe demostrar la habilidad en un contexto nuevo y recuperarla después.
7. **Evaluación sin pistas.** El modo examen no recibe ayudas, opiniones ni memoria emocional del Tutor.
8. **Progreso honesto.** Cobertura, dominio, retención y readiness se muestran por separado.
9. **Tecnología reemplazable.** El activo de Starbiz es el currículo, las reglas, el banco y los datos validados; no el nombre de un modelo.
10. **Corrección que conserva la confianza.** Se priorizan patrones, no todos los errores a la vez.
11. **Accesibilidad y recuperación.** Una mala conexión o una discapacidad no debe interpretarse como falta de conocimiento.
12. **Mejora con control.** Ningún cambio de prompt, modelo, rúbrica o contenido altera silenciosamente resultados históricos.
13. **Protección adecuada a la edad.** Consentimiento, interfaz, contenido, permisos y escalamiento cambian por banda etaria.
14. **Familia sin vigilancia secreta.** El apoderado gestiona servicio, pago y resumen de progreso; no recibe conversaciones completas por defecto.
15. **Supervisión humana significativa.** La IA no toma sola decisiones educativas de alto impacto sobre menores.

---

## 3. Nombre y mapa del sistema

Se propone usar **STAR Learning OS** como nombre interno de la plataforma completa. No es una metodología adicional; es la implementación tecnológica de STAR Mastery.

### 3.1 Ocho motores internos

| Motor | Responsabilidad |
|---|---|
| **StarGraph** | Competencias, prerrequisitos, estándares y relación CEFR/TOEFL |
| **StarContent** | Lecciones, actividades, recursos, rúbricas, licencias y versiones |
| **StarEvidence** | Registro inmutable de respuestas y evidencias de aprendizaje |
| **StarMastery** | Estado, confianza, frescura, dominio y próxima revisión |
| **StarAdapt** | Selección de la siguiente acción dentro del currículo aprobado |
| **StarAssess** | Placement, benchmarks, puertas de etapa y simulaciones aisladas |
| **StarProof** | Promoción, certificado interno y readiness TOEFL |
| **StarAudit** | Versiones, explicaciones, revisiones, apelaciones y cambios |

### 3.2 Flujo académico fundamental

~~~mermaid
flowchart TB
    subgraph Entrega["Ejecución y evidencia"]
        direction LR
        A["Competencia aprobada"] --> B["Contrato de lección"]
        B --> C["Actividad o misión"]
        C --> D["Respuesta del alumno"]
    end
    subgraph Decision["Puntuación y decisión"]
        direction LR
        E["Puntuación independiente"] --> F["StarEvidence"]
        F --> G["StarMastery"]
    end
    D --> E
    G --> H["StarAdapt"]
    H --> I["Siguiente acción"]
    G --> J["StarProof"]
    J --> K["Promoción o readiness"]
    F --> L["StarAudit"]
    G --> L
    J --> L
~~~

El Mentor IA participa en la experiencia y produce candidatos de evidencia. No modifica directamente StarMastery ni StarProof.

---

## 4. Actores, roles y permisos

Los modos Navigator, Tutor, Talk Partner, Repair Coach y Examiner son funciones de IA. No sustituyen los roles de acceso del personal.

### 4.1 Roles humanos y de plataforma

| Rol | Puede | No puede |
|---|---|---|
| Estudiante menor | Aprender, rendir pruebas, consultar progreso, asentir, reportar y apelar | Comprar, cambiar permisos legales, editar puntuaciones o ver datos del apoderado |
| Estudiante adulto | Aprender, rendir pruebas, consultar progreso, gestionar cuenta y apelar | Editar puntuaciones, currículo o evidencias |
| Apoderado legal | Autorizar servicio y voz, gestionar plan/pago, dispositivos, derechos de datos y resumen de progreso | Ver banco seguro o conversaciones completas por defecto; modificar dominio |
| Pagador autorizado | Pagar, ver comprobantes y gestionar el medio de pago | Obtener por el pago autoridad legal o acceso académico automático |
| Director académico | Aprobar estándares, versiones mayores y decisiones finales | Borrar auditoría |
| Autor curricular | Crear competencias, lecciones y actividades en borrador | Publicar su propio contenido sin revisión |
| Revisor académico | Revisar y aprobar contenido | Cambiar cobros |
| Especialista de evaluación | Diseñar blueprints, rúbricas, formularios y reglas de corte | Enseñar dentro de sesiones del alumno evaluado |
| Revisor de Speaking/Writing | Puntuar muestras y resolver discrepancias | Ver datos comerciales innecesarios |
| Revisor pedagógico juvenil | Confirmar, corregir o invalidar decisiones significativas de menores | Dar una aprobación automática sin revisar evidencia |
| Calidad de IA | Gestionar prompts, modelos, pruebas y replay | Alterar una calificación histórica sin expediente |
| Responsable de salvaguarda | Atender señales, coordinar acciones y cerrar casos según protocolo | Usar casos para marketing o compartirlos sin necesidad |
| Privacidad/ODP | Supervisar consentimientos, derechos, impacto, proveedores e incidentes | Decidir resultados académicos |
| Soporte | Resolver cuenta, acceso y problemas técnicos | Ver banco seguro o audio sin necesidad y permiso |
| Finanzas/operaciones | Gestionar pagos, planes, pausas y reembolsos | Modificar dominio |
| Administrador técnico | Configuración, disponibilidad y seguridad | Decidir resultados académicos |
| Auditor | Consultar trazas y expedientes de solo lectura | Crear, editar o aprobar |

### 4.2 Segregación mínima

- Quien crea contenido no publica sin una segunda aprobación.
- Quien modifica una rúbrica no puede aplicarla retroactivamente.
- Quien revisa una apelación no debe ser la única persona que produjo el score original.
- Soporte y finanzas no pueden ver respuestas del banco seguro.
- El Tutor no ve claves, no cambia scores y no promueve.
- Todo override humano registra responsable, motivo, valor anterior y valor nuevo.
- El apoderado, el pagador y el alumno tienen identidades y sesiones separadas.
- El pago no concede acceso a conversación, audio o expediente de safety.
- Quien revisa un caso de salvaguarda accede solo a la evidencia mínima necesaria.
- Ninguna decisión significativa de un menor pasa a final sin el review requerido.

---

## 5. Ciclo de vida del alumno

El estado académico, el estado comercial y el estado técnico son independientes.

### 5.1 Estados principales

~~~mermaid
flowchart TB
    subgraph Entrada["Entrada, familia y activación"]
        direction LR
        V["Visitante"] --> R["Edad declarada"]
        R --> FAM["Apoderado verificado"]
        FAM --> C["Consentimiento + asentimiento"]
        C --> D["Diagnóstico"]
        D --> P["Plan pendiente"]
        P --> A["Activo"]
    end
    subgraph Ruta["Ruta académica"]
        direction LR
        A --> E["En ruta"]
        E --> F["Preparación final"]
        F --> T["Ready TOEFL"]
        T --> G["Egresado"]
    end
    E --> K["En riesgo"]
    K --> RP["Replanificación"]
    RP --> E
    E --> PA["Pausado"]
    PA --> E
    E --> CAN["Cancelado"]
~~~

El pago puede estar activo, en gracia, rechazado, pausado o cancelado sin reescribir el estado académico.

### 5.2 Recorrido completo

1. Descubrimiento y StarMap Preview.
2. Age gate y banda 12–13, 14–17 o 18+ antes de voz o PII no necesaria.
3. Invitación, identidad y verificación del apoderado cuando el alumno es menor.
4. Consentimientos separados del adulto y aviso/asentimiento juvenil comprensible.
5. Perfil de meta, calendario escolar y disponibilidad real.
6. Prueba de micrófono, audífonos, navegador y conexión.
7. StarMap 360 juvenil modular, con pausas y reanudación.
8. Resultado provisional por habilidad, confianza y ruta sugerida.
9. Revisión pedagógica del placement del menor.
10. Comparación conjunta de Flex, Accelerated y Sprint; el adulto paga y activa.
11. Semana de calibración del placement.
12. Plan diario: enseñar, practicar, actuar y reforzar.
13. Benchmark semanal y mensual.
14. Puertas de unidad y etapa con review cuando corresponde.
15. Preparación específica de formato.
16. Simulaciones, revisión de readiness y certificado interno.
17. TOEFL oficial y carga opcional del resultado consentido.

### 5.3 Recorrido familiar

El portal del apoderado muestra carga, asistencia, progreso por habilidades, próximos hitos, pagos, consentimientos, dispositivos y soporte. No muestra por defecto audio, transcripciones completas, secretos del alumno ni texto de casos de protección. Cualquier excepción debe estar explicada al joven y responder a una finalidad legítima.

El alumno dispone en todo momento de **Pausar**, **Silenciar**, **Salir** y **Reportar**. El apoderado puede revocar dispositivos o consentimientos; la revocación impide crear nuevas sesiones de voz.

### 5.4 Cinco momentos que deben sentirse extraordinarios

1. **Me entendió:** primera conversación natural con el Mentor.
2. **Sabe qué necesito:** resultado StarMap explicado con evidencias.
3. **Ahora puedo hacerlo:** primera reparación demostrada en una situación nueva.
4. **Puedo ver mi avance:** primer hito basado en dominio, no en actividad.
5. **Estoy preparado:** evidencia estable y recomendación responsable para TOEFL.

---

## 6. Arquitectura de información del alumno

### 6.1 Navegación principal

En móvil se recomienda una barra inferior de cinco opciones:

1. **Inicio**
2. **Ruta**
3. **Hablar**
4. **Repasar**
5. **Progreso**

Perfil, privacidad, soporte y configuración se ubican en el menú superior. Pagos, facturas, cambios de plan y paquetes de voz de menores viven en el portal del apoderado, no en la experiencia juvenil.

### 6.2 Pantalla Inicio

Debe responder en menos de cinco segundos:

- ¿Qué debo hacer ahora?
- ¿Por qué debo hacerlo?
- ¿Estoy acercándome a mi meta?

Componentes:

- Botón principal **Continuar mi misión**.
- Máximo de tres bloques para hoy.
- Tiempo estimado.
- Meta semanal frente a actividad real.
- Próxima misión de voz.
- Repasos urgentes.
- Brecha prioritaria.
- Estado de trayectoria: en ruta, en riesgo o necesita replanificación.
- Próximo hito, no un porcentaje único.

Reglas:

- El alumno inicia en dos pulsaciones.
- Un atraso genera un plan de recuperación, no castigo.
- Si está al día, se ofrece práctica opcional.
- Tras una ausencia larga se realiza una recalibración corta.

### 6.3 Pantalla Ruta

Debe mostrar:

- Resultado final Starbiz Global B2.
- Etapa, unidad y competencia actual.
- Nodos dominados, en desarrollo, por revisar y bloqueados.
- Requisitos exactos de la próxima puerta.
- Carriles paralelos de reparación.
- Relación entre inglés real y formato TOEFL.

### 6.4 Pantalla Progreso

Nunca debe mezclar en una sola cifra:

- **Cobertura:** contenido recorrido.
- **Dominio:** capacidad demostrada.
- **Retención:** capacidad recuperada con el tiempo.
- **Readiness:** rendimiento bajo condiciones TOEFL.

Debe incluir nivel estimado, intervalo de confianza, cuatro habilidades, horas previstas/reales, proyección de fecha, historial de simulaciones y acciones de mayor impacto.

---

## 7. Requisitos funcionales de la plataforma del alumno

### 7.1 Identidad, consentimiento y prueba técnica

| ID | Requisito | Criterio de aceptación |
|---|---|---|
| IDN-01 | Crear identidades separadas de alumno y apoderado | No se comparten credenciales ni permisos |
| IDN-02 | Registrar banda de edad, país, zona horaria e idioma principal | No se activa un flujo no permitido por edad o región |
| IDN-03 | Verificar razonablemente al apoderado y su vínculo | La evidencia mínima queda trazable; no se conserva DNI por defecto |
| IDN-04 | Vincular y revocar dispositivos juveniles | El adulto puede cerrar una sesión perdida sin borrar progreso |
| CNS-01 | Consentimientos separados para servicio, IA/voz, almacenamiento, transferencia, analítica, marketing e investigación | Cada finalidad tiene grantor, versión, vigencia y revocación |
| CNS-02 | Mostrar aviso comprensible y registrar asentimiento juvenil | El alumno sabe que habla con IA, qué se guarda, quién lo ve y cómo reportar |
| CNS-03 | Exportación, corrección, oposición y eliminación de datos | Existe solicitud trazable y confirmación |
| CNS-04 | Comprobar consentimiento y ZDR antes de crear voz para 12–13 | Si falta cualquiera, la API deniega la sesión |
| TEC-01 | Probar micrófono, salida de audio, ruido, navegador y red | El sistema informa si la calidad permite una sesión válida |
| TEC-02 | Guardar adaptaciones de accesibilidad | Se aplican en lecciones y pruebas autorizadas |

### 7.2 StarMap Preview y StarMap 360

**StarMap Preview** será una experiencia gratuita de 10–15 minutos. Antes de verificar edad y permisos opera en modo informativo y no captura voz de menores. Cuando la voz está autorizada, entrega un rango preliminar, una fortaleza, una brecha y una breve conversación. No decide la ubicación definitiva.

**StarMap 360** será el diagnóstico obligatorio. En el MVP debe ser multietapa, no un CAT psicométrico completo:

1. Perfil y prueba técnica.
2. Router de Language Use, Reading y Listening.
3. Módulo inferior, central o superior según el router.
4. Dos muestras de Speaking.
5. Dos muestras de Writing.
6. Control de consistencia.
7. Confirmación durante los primeros siete días.

| ID | Requisito | Criterio de aceptación |
|---|---|---|
| MAP-01 | Pausar y reanudar el diagnóstico | No se pierden respuestas válidas |
| MAP-02 | Mostrar progreso y duración | El alumno puede dividirlo sin penalización |
| MAP-03 | Entregar resultado por habilidad y confianza | No se reduce a un promedio general |
| MAP-04 | Detectar evidencia insuficiente o inconsistente | El estado queda provisional y solicita calibración |
| MAP-05 | Crear una ruta asimétrica | Una debilidad grave no se oculta con otra habilidad alta |
| MAP-06 | Explicar la recomendación | Se muestran evidencias, primer nodo pendiente y brechas |
| MAP-07 | Invalidar un bloque por fallo técnico | El fallo no se interpreta como bajo nivel |
| MAP-08 | Conservar ambos intentos autorizados | El sistema no elige silenciosamente solo el mejor |
| MAP-09 | Dividir el diagnóstico juvenil en bloques con pausas | La fatiga no se convierte en una medición de nivel |
| MAP-10 | Someter el placement definitivo de menores a revisión pedagógica | La recomendación IA permanece provisional hasta decisión humana |

### 7.3 Selector de ritmo, compra y suscripción

La comparación debe mostrar horas, voz incluida, actividades, fecha proyectada, exigencia, precio, renovación y consecuencia de no cumplir la carga.

| ID | Requisito | Criterio de aceptación |
|---|---|---|
| COM-01 | Recomendar un ritmo compatible con disponibilidad | No se vende una fecha imposible |
| COM-02 | Mostrar precio, moneda, impuestos y renovación antes del pago | No existen cargos ocultos |
| COM-03 | Administrar cambio, pausa y cancelación | El apoderado/pagador puede hacerlo sin ventas; el menor no compra |
| COM-04 | Medir minutos activos de voz | No se cobra espera, caída o reconexión |
| COM-05 | Alertar al 70%, 90% y 100% del cupo | Alumno y apoderado conocen el límite; cualquier compra ocurre en el portal adulto |
| COM-06 | Conservar progreso al cancelar | El historial no se borra por el estado de pago |
| COM-07 | Aplicar upgrade y downgrade según política | La fecha efectiva y el prorrateo son visibles |

### 7.4 StarLessons

Cada lección se ejecuta desde un contrato versionado que declara:

- Objetivo observable.
- Contexto de uso.
- Prerrequisitos.
- Duración.
- Ayudas permitidas.
- Actividades obligatorias.
- Rúbrica.
- Evidencia requerida.
- Condición de salida.

Secuencia mínima:

`activar → modelar → practicar con guía → producir sin guía → corregir → volver a producir → programar recuperación`

| ID | Requisito | Criterio de aceptación |
|---|---|---|
| LES-01 | Mostrar objetivo, utilidad, duración y condición de éxito | El alumno sabe qué debe demostrar |
| LES-02 | Adaptar explicación y apoyo | El estándar de salida no cambia |
| LES-03 | Cambiar de método tras fallos repetidos | No repite el mismo ejercicio indefinidamente |
| LES-04 | Saltar práctica redundante con evidencia válida | No obliga a consumir contenido ya dominado |
| LES-05 | Reportar contenido ambiguo o incorrecto | Se excluye de puntuación mientras se revisa |
| LES-06 | Autosave después de cada actividad | Se recupera el último punto consistente |

### 7.5 StarTalk Missions

Antes de hablar se muestra objetivo, escenario, duración, vocabulario opcional, habilidad observada, audio y política de corrección.

Controles durante la sesión:

- Pausar.
- Repetir.
- Hablar más lento.
- Pedir una pista cuando esté permitido.
- Mostrar u ocultar subtítulos.
- Reportar un problema.
- Volver al objetivo.
- Terminar.

Política de corrección:

- No interrumpir cada error.
- Priorizar errores que impiden comprensión o pertenecen al objetivo.
- Trabajar uno o dos patrones centrales por sesión.
- Permitir modo suave, equilibrado o intensivo.
- Toda corrección importante termina en una nueva producción.

| ID | Requisito | Criterio de aceptación |
|---|---|---|
| TLK-01 | Preflight de audio, red, cupo y contrato | No inicia una sesión inválida |
| TLK-02 | Turnos naturales e interrupción del Mentor | El alumno puede intervenir sin esperar un monólogo |
| TLK-03 | Guardar estado tras cada intercambio | Una caída no destruye el progreso |
| TLK-04 | Reconectar o cambiar temporalmente a texto | La sesión ofrece una recuperación clara |
| TLK-05 | Separar no comprensión técnica de error lingüístico | Audio deficiente no reduce el score |
| TLK-06 | Cerrar con fortalezas, patrones y siguiente acción | El feedback produce una reparación concreta |
| TLK-07 | Retirar evidencia reportada hasta revisión | Un error del Mentor no perjudica al alumno |
| TLK-08 | Mostrar consumo de minutos | Solo contabiliza tiempo activo |
| TLK-09 | Mostrar Pausar, Salir, Reportar y Silenciar durante toda la sesión | El alumno mantiene control visible del micrófono y la interacción |
| TLK-10 | No persistir audio de práctica juvenil por defecto | Solo queda evidencia pedagógica mínima y seudónima |
| TLK-11 | Aplicar contrato y política de edad | El Mentor no pide secretos, contacto, colegio, ubicación, fotos o redes |
| TLK-12 | Permitir cierre por Safety Gateway | El servidor puede redirigir, pausar, finalizar y escalar una sesión |

### 7.6 StarRepair

Estados:

`detectado → priorizado → en reparación → correcto con guía → correcto sin guía → transferencia → pendiente de retención → consolidado`

| ID | Requisito | Criterio de aceptación |
|---|---|---|
| RPR-01 | Agrupar errores por patrón | No muestra una lista abrumadora de fallos |
| RPR-02 | Explicar el error en contexto | El alumno comprende forma, significado y efecto |
| RPR-03 | Exigir producción nueva | Una respuesta de reconocimiento no cierra la reparación |
| RPR-04 | Probar en un contexto diferente | La memorización del ejemplo no acredita reparación |
| RPR-05 | Reabrir un patrón recurrente | Influye en el plan semanal |

### 7.7 StarReview

El repaso incluye vocabulario, comprensión, pronunciación, gramática, producción oral y escrita, y errores reparados.

| ID | Requisito | Criterio de aceptación |
|---|---|---|
| RVW-01 | Construir una cola diaria de duración predecible | El alumno ve cuántos minutos necesita |
| RVW-02 | Programar inicialmente 1, 3, 7, 14 y 30 días | Los intervalos se ajustan con desempeño |
| RVW-03 | Combinar reconocimiento y producción | No se limita a tarjetas |
| RVW-04 | Priorizar tras acumulación | Una ausencia no crea cientos de pendientes |
| RVW-05 | Explicar por qué reaparece una competencia | El repaso se percibe como parte del dominio |

### 7.8 StarProof y modo evaluación

Niveles:

1. Check formativo.
2. Puerta de unidad.
3. Puerta de etapa.
4. Simulación por sección.
5. Simulación completa.

| ID | Requisito | Criterio de aceptación |
|---|---|---|
| PRF-01 | Interfaz separada del Tutor | Anuncia modo evaluación y retira ayudas |
| PRF-02 | Formulario y rúbrica congelados | Puede reconstruirse la prueba exacta |
| PRF-03 | Preflight técnico | Un fallo genera repetición controlada o invalidación |
| PRF-04 | Scoring independiente | El Mentor cotidiano no modifica el resultado |
| PRF-05 | Mostrar score estimado, rango y confianza | No presenta falsa precisión ni score oficial |
| PRF-06 | Distinguir conocimiento de estrategia | El plan de intervención cambia según la causa |
| PRF-07 | Permitir apelación | La resolución conserva trazabilidad |
| PRF-08 | Ocultar banco y claves | Tutor, soporte y cliente no acceden |
| PRF-09 | Mantener provisional toda decisión significativa juvenil | Placement, promoción, integridad, readiness y certificado esperan revisión humana |
| PRF-10 | Prohibir sanción automática por señal de integridad | Una señal crea un caso; una persona revisa la evidencia |

### 7.9 Soporte y notificaciones

El Mentor IA atiende el aprendizaje. Un asistente de soporte puede resolver preguntas operativas. Debe existir soporte separado para alumno y familia, además de escalamiento humano para pagos, privacidad, salvaguarda, accesibilidad y fallos no resueltos.

| ID | Requisito | Criterio de aceptación |
|---|---|---|
| SUP-01 | Clasificar casos académicos, técnicos, familiares, financieros, de privacidad o salvaguarda | Cada caso llega al equipo correcto |
| SUP-02 | Crear número y estado de caso | El alumno puede consultar seguimiento |
| SUP-03 | Salida visible del soporte automático | No queda atrapado en un bucle |
| SUP-04 | Pedir permiso antes de adjuntar audio | Soporte no recibe más datos de los necesarios |
| NTF-01 | Zona horaria, horarios silenciosos y preferencias | Los avisos respetan configuración |
| NTF-02 | Cada aviso conduce a una acción | No usa culpa, miedo ni mensajes vacíos |
| SAF-01 | Reporte juvenil siempre visible | El alumno puede reportar texto, voz, contenido o conducta y recibe número de caso |
| SAF-02 | Triage P0–P3 con protocolo y SLA | La severidad determina pausa, evidencia mínima y atención humana |
| SAF-03 | Notificación contextual al apoderado | No se avisa automáticamente si el posible riesgo involucra al hogar |
| SAF-04 | Prohibir contacto humano fuera de plataforma | Toda comunicación con el menor queda autorizada y auditada dentro del sistema |

---

## 8. Backoffice obligatorio

### 8.1 Curriculum Studio

Gestiona:

- StarGraph.
- Contratos de lección.
- Actividades y recursos.
- Mapeos CEFR/TOEFL.
- Licencias y fuentes.
- Traducciones.

Workflow:

`borrador → revisión académica → revisión evaluativa → QA → aprobado → publicado → retirado`

Una versión publicada es inmutable. Una modificación crea una nueva versión.

### 8.2 Assessment Studio

Gestiona:

- Blueprints.
- Ítems.
- Claves.
- Formularios.
- Rúbricas.
- Cortes.
- Ítems ancla.
- Control de exposición.
- Calibración.

Debe estar aislado del repositorio cotidiano del Tutor.

### 8.3 AI Control Center

Gestiona:

- Constitución del Mentor.
- Prompts por modo.
- Modelos y snapshots.
- Herramientas y permisos.
- Conjuntos de evaluación.
- Replay de sesiones anonimizadas.
- Resultados de regresión.
- Activación, canary y rollback.

### 8.4 Academic Review

Colas:

- Speaking y Writing de alta consecuencia.
- Baja confianza.
- Casos fronterizos.
- Discrepancias.
- Posible sesgo técnico.
- Contenido reportado.
- Apelaciones.
- Overrides.

Para menores también incluye placement definitivo, promociones, integridad, readiness y certificado. El revisor puede confirmar, corregir o invalidar; debe registrar motivo.

### 8.5 Safeguarding Console

Gestiona, con acceso especialmente restringido:

- Señales y severidad P0–P3.
- Evidencia mínima redactada.
- Pausa/cierre de sesión y acciones tomadas.
- Responsable, SLA, notas y resolución.
- Reglas de contacto con alumno/apoderado.
- Recursos locales y derivaciones autorizadas.
- Auditoría de cada acceso.

### 8.6 Student and Family Operations

Muestra:

- Estado académico.
- Plan y ciclo.
- Riesgo de abandono.
- Incidentes.
- Pausas y reactivaciones.
- Soporte.
- Consentimientos, sin exponer datos innecesarios.
- Apoderados, vínculos, dispositivos y transiciones de edad.

### 8.7 Commerce y Usage

Muestra:

- Suscripciones.
- Pagos.
- Renovaciones.
- Voz incluida, consumida y adicional.
- Costo por sesión, alumno y plan.
- Anomalías o abuso.
- Reembolsos y créditos.

### 8.8 Analytics y Compliance

Incluye:

- Aprendizaje y retención.
- Evaluación y acuerdo humano–IA.
- Conversión y permanencia.
- Costos y margen de contribución.
- Latencia y errores.
- Accesos sensibles.
- Consentimientos.
- Solicitudes de datos.
- Auditoría de cambios.

---

## 9. Especificación del Mentor STAR

### 9.1 Una identidad, seis modos

| Modo | Función | Autoridad |
|---|---|---|
| Navigator | Explica la ruta y el siguiente paso | Recomienda; no promueve |
| Tutor | Enseña una competencia aprobada | Adapta apoyo; no inventa objetivos |
| Talk Partner | Ejecuta escenarios y conversación | Se mantiene dentro de la misión |
| Repair Coach | Repara patrones y programa práctica | Crea candidatos dentro de plantillas |
| Examiner | Administra una tarea aislada | No enseña ni ofrece pistas |
| Support Guide | Orientación técnica básica | No decide pagos, privacidad ni dominio |

El Examiner puede usar la misma voz de marca, pero la interfaz debe anunciar el cambio de condiciones.

### 9.2 Capas de contexto

El prompt no será una metodología. Cada sesión recibe un paquete controlado:

1. **Constitución:** identidad, tono, límites y conducta estable.
2. **Política:** privacidad, seguridad, edad, corrección y escalamiento.
3. **Modo:** Tutor, Talk, Repair, Navigator o Examiner.
4. **Contrato de lección:** objetivo, tiempo, secuencia, ayuda y salida.
5. **Snapshot del alumno:** solo datos necesarios para esa sesión.
6. **Herramientas:** funciones autorizadas con esquemas estrictos.
7. **Formato de cierre:** resumen estructurado y candidatos de evidencia.
8. **Versiones:** modelo, prompt, currículo, rúbrica y regla.

### 9.3 Herramientas permitidas

| Herramienta conceptual | Acceso | Regla |
|---|---|---|
| get_student_snapshot | Lectura | Devuelve datos mínimos de aprendizaje |
| get_lesson_contract | Lectura | Solo versión publicada |
| get_approved_activity | Lectura | Nunca banco seguro en modo Tutor |
| get_due_reviews | Lectura | Priorizados por StarMastery |
| save_evidence_candidate | Escritura limitada | No cambia dominio |
| create_repair_candidate | Escritura limitada | Requiere plantilla aprobada |
| report_incident | Escritura | Audio, seguridad, contenido o fallo |
| request_assessment | Solicitud | StarAssess decide si procede |
| end_session_summary | Escritura estructurada | Se valida antes de guardar |

El Mentor no puede:

- Escribir directamente en tablas de dominio.
- Cambiar precios o cupos.
- Otorgar certificados.
- Alterar evidencias.
- Publicar contenido.
- Consultar claves de examen.
- Exponer credenciales.
- Declarar un score oficial.

### 9.4 Memoria

La memoria persistente almacena hechos pedagógicos estructurados:

- Preferencias.
- Competencias.
- Errores recurrentes.
- Ayudas que funcionaron.
- Pronunciación prioritaria.
- Próximas revisiones.
- Historial de hitos.

No se debe reenviar la conversación histórica completa en cada sesión. Se conserva un resumen mínimo y se aplican reglas de retención.

---

## 10. Arquitectura de voz y modelos

### 10.1 Decisión recomendada: arquitectura híbrida

OpenAI distingue dos patrones: speech-to-speech para conversación natural y baja latencia, y una cadena speech-to-text → razonamiento → text-to-speech para flujos más controlados. Starbiz necesita ambos.

| Uso | Arquitectura | Motivo |
|---|---|---|
| Conversación cotidiana | Speech-to-speech Realtime | Naturalidad, interrupciones y baja latencia |
| Roleplay y fluidez | Speech-to-speech Realtime | Turnos y emoción conversacional |
| Reparación guiada | Realtime más herramientas | Corrección dentro de una misión controlada |
| Placement oral | Entrevista Realtime + scoring independiente posterior | Experiencia natural con decisión aislada |
| Puerta de Speaking | Audio congelado + transcripción + scorer versionado | Auditabilidad |
| Simulación final | Captura controlada y evaluación separada | Alta consecuencia |

Para clientes web o móviles se usará WebRTC. La clave estándar permanece en el servidor y el cliente recibe un secreto efímero. La lógica y las herramientas sensibles se ejecutan en el servidor mediante un canal de control.

Fuentes oficiales:

- [Voice agents: arquitecturas live y chained](https://developers.openai.com/api/docs/guides/voice-agents)
- [WebRTC y secretos efímeros](https://developers.openai.com/api/docs/guides/realtime-webrtc)
- [Control server-side de sesiones Realtime](https://developers.openai.com/api/docs/guides/realtime-server-controls)

### 10.2 Enrutamiento de modelos

El nombre de un modelo no debe vivir dentro del currículo. Un registro de configuración decide por tarea:

- Modelo principal.
- Snapshot cuando exista.
- Modelo alternativo.
- Límites.
- Prompt versionado.
- Fecha de activación.
- Resultado de regresión.

Hipótesis inicial:

- gpt-realtime-2.1, el modelo insignia, para toda la conversación juvenil del piloto, incluida la cotidiana.
- gpt-realtime-2.1-mini únicamente en tareas delimitadas de baja consecuencia y solo después de superar las evaluaciones juveniles de seguridad, calidad y cumplimiento de instrucciones (alineado con Metodología §18, Decisión D21 y Stack §8.4).
- Modelo de texto con salida estructurada para planificación, resúmenes y scoring auxiliar.
- Scorer separado y congelado para evaluaciones de alta consecuencia.

El modelo mini debe validarse contra una referencia mayor antes de asumir que cumple instrucciones y herramientas con la misma fiabilidad. La guía oficial de costos recomienda probar primero la calidad y después optimizar con mini. [Gestión de costos Realtime](https://developers.openai.com/api/docs/guides/realtime-costs)

### 10.3 Ciclo de una sesión de voz

**Antes**

1. Verificar autenticación, plan y minutos.
2. Ejecutar prueba técnica.
3. Cargar contrato y snapshot mínimo.
4. Crear session_id e idempotency key.
5. Emitir secreto efímero desde backend.
6. Abrir WebRTC y canal de control.

**Durante**

1. Detectar turnos con semantic VAD; ofrecer push-to-talk si falla.
2. Registrar eventos, no solo una transcripción final.
3. Ejecutar herramientas en servidor.
4. Guardar checkpoints tras cada intercambio.
5. Vigilar desvío de objetivo, latencia y costo.
6. Aplicar política de interrupción y subtítulos.

Semantic VAD reduce interrupciones cuando el alumno duda o deja una frase incompleta. [Voice activity detection](https://developers.openai.com/api/docs/guides/realtime-vad)

**Después**

1. Cerrar el contador de tiempo activo.
2. Guardar audio conforme al consentimiento.
3. Validar transcripción y resumen.
4. Enviar candidatos a scoring.
5. Crear evidencias válidas.
6. Actualizar StarMastery mediante reglas.
7. Programar StarRepair y StarReview.
8. Mostrar feedback comprensible.

### 10.4 Fallos y recuperación

| Fallo | Respuesta |
|---|---|
| Mala red | Reducir elementos visuales, reconectar y ofrecer push-to-talk |
| Desconexión | Retomar desde el último checkpoint sin doble cobro |
| Micrófono bloqueado | Guía simple y modo texto temporal |
| Ruido alto | Pedir cambio, repetir y no penalizar automáticamente |
| VAD interrumpe | Cambiar eagerness o push-to-talk |
| Modelo no disponible | Fallback aprobado; si cambia condiciones evaluativas, invalidar o reprogramar |
| Mentor se desvía | Herramienta para volver al contrato y registrar incidente |
| Fin inesperado | Cerrar consumo y permitir reanudar |
| Contexto demasiado largo | Resumir y abrir una nueva sesión lógica |

Las sesiones Realtime tienen una duración máxima documentada de 60 minutos; Starbiz debe dividir su experiencia en misiones más cortas. [Ciclo de sesión Realtime](https://developers.openai.com/api/docs/guides/realtime-conversations)

---

## 11. StarGraph y modelo de competencia

### 11.1 Jerarquía

1. Resultado: Starbiz Global B2.
2. Habilidades: Reading, Listening, Speaking, Writing e interacción.
3. Competencias observables.
4. Microcompetencias.
5. Demandas de formato TOEFL.

El nodo de formato depende del nodo lingüístico; no lo reemplaza.

Ejemplo:

- SPK.B2.ARG.01: expresar una posición clara, desarrollada, cohesionada e inteligible.
- TEST.TOEFL26.SPK.INT.01: hacerlo con las condiciones de tiempo y formato de la tarea correspondiente.

### 11.2 Campos obligatorios de un nodo

- ID permanente.
- Versión.
- Descriptor observable.
- Habilidad y nivel.
- Contexto.
- Prerrequisitos duros.
- Apoyos recomendados.
- Criticidad: crítica o complementaria.
- Criterios y dimensiones de rúbrica.
- Pisos no compensables.
- Ayudas permitidas.
- Evidencias mínimas.
- Regla de transferencia.
- Recuperación diferida.
- Horizonte de frescura.
- Alineación CEFR/TOEFL.
- Actividades e instrumentos autorizados.
- Responsable, estado y fecha de aprobación.

Relaciones:

- requires
- supports
- practiced_by
- assessed_by
- transfers_to
- aligns_to

---

## 12. StarEvidence y StarMastery

### 12.1 Estados de una competencia

`no vista → expuesta → en desarrollo → dominio provisional → dominada → revisión requerida`

Si falla una nueva evidencia, puede pasar a reparación sin borrar la historia.

### 12.2 Requisitos provisionales de dominio

Una competencia crítica se declara dominada cuando cumple simultáneamente:

1. Al menos tres evidencias válidas.
2. Evidencias en dos días distintos.
3. Una producción independiente sin pistas.
4. Una tarea nueva de transferencia.
5. Una recuperación diferida, inicialmente después de siete días.
6. Umbral global provisional de 80% o superior.
7. Piso en cada dimensión crítica.
8. Sin alertas graves de audio, integridad o asistencia indebida.
9. Confianza mínima según cantidad y calidad de evidencia.

Estos umbrales se validarán con datos; no deben venderse como propiedades psicométricas demostradas.

### 12.3 Dominio y frescura

- **Dominio acumulado:** capacidad demostrada históricamente.
- **Frescura:** evidencia de que puede recuperarla ahora.

El tiempo no borra el dominio. Si vence la frescura, el estado pasa a revisión requerida.

### 12.4 Calidad de evidencia

Peso provisional para ordenar evidencia:

| Evidencia | Fiabilidad relativa inicial |
|---|---:|
| Práctica con guía | 0.30 |
| Práctica sin guía | 0.70 |
| Transferencia no vista | 0.90 |
| Recuperación diferida | 0.90 |
| Evaluación segura | 1.00 |

Los pesos no sustituyen las puertas categóricas. Un buen promedio no compensa la ausencia de producción independiente o un piso crítico.

### 12.5 Regla de promoción corregida

- 100% de competencias críticas de la etapa.
- Al menos 85% de competencias complementarias.
- Pisos definidos en cada habilidad.
- Benchmark aprobado por habilidad, no solo promedio.
- Retención vigente.
- Ninguna alerta técnica o de integridad sin resolver.

El certificado exige aprobar todas las puertas de etapa hasta S4; no completar cada actividad opcional.

### 12.6 StarAdapt

El motor, no el modelo de voz, crea el conjunto de próximas acciones. Prioriza:

1. Prerrequisito bloqueante.
2. Revisión vencida.
3. Error recurrente.
4. Competencia crítica de la etapa.
5. Meta y fecha.
6. Balance entre habilidades.
7. Fatiga y carga viable.

El Mentor elige ejemplos y forma de explicación dentro del conjunto autorizado.

---

## 13. StarAssess y StarProof

### 13.1 Separación de evaluación

1. El Tutor solicita una evaluación.
2. StarAssess decide elegibilidad.
3. Selecciona un formulario congelado.
4. Examiner recibe únicamente instrumento, rúbrica y adaptaciones.
5. El alumno responde.
6. Un scorer independiente produce dimensiones, confianza y alertas.
7. Una regla versionada decide el estado.
8. StarAudit guarda el expediente.

Examiner no recibe:

- Pistas usadas.
- Opinión del Tutor.
- Datos comerciales.
- Fecha que ventas prometió.
- Historial emocional.
- Claves no necesarias para administrar la tarea.

### 13.2 Certificación interna y readiness

Son decisiones separadas:

**Certificado Starbiz Global B2**

- Todas las competencias críticas B2 dominadas.
- 85% o más de complementarias.
- Pisos en las cuatro habilidades.
- Retención y transferencia.
- Puertas S4 completas.

**Ready para TOEFL 4.5**

- Certificado o dominio B2 vigente.
- Dos de las tres simulaciones recientes en 4.5 o más, incluyendo la más reciente.
- Ninguna sección por debajo de 4.0 en esas dos.
- Simulaciones en días distintos y condiciones válidas.
- Evidencia reciente, inicialmente dentro de 30 días.
- Sin alertas técnicas o de integridad.
- Confianza visible: baja, media o alta.

La simulación es una estimación interna. No reproduce ni reclama la escala propietaria de ETS.

### 13.3 Revisión humana

Para alumnos menores, durante y después del piloto:

- 100% del placement definitivo.
- 100% de promociones de etapa y decisiones que bloqueen el avance.
- 100% de alertas de integridad antes de invalidar o sancionar.
- 100% de readiness y certificado.
- Todos los casos fronterizos, de baja confianza, anómalos o apelados.

Para práctica de baja consecuencia se permite muestreo de calidad. Para adultos, después de demostrar calibración, la dirección puede aprobar 5–10% aleatorio, manteniendo 100% de fronterizos, anomalías, cambios de modelo y apelaciones.

El resultado se muestra como **provisional, en revisión o final**. La enseñanza visible puede seguir siendo 100% IA aunque las decisiones educativas significativas de menores tengan supervisión humana capaz de corregir o invalidar.

---

## 14. Diferencia entre ritmos

### 14.1 Entitlements

| Plan | Carga semanal | Voz incluida | Uso recomendado |
|---|---:|---:|---|
| Flex | 8 h | 90 min | Compatible con carga escolar moderada |
| Accelerated | 12 h | 150 min | Opción equilibrada para jóvenes con disponibilidad demostrada |
| Sprint | 18–20 h | 240 min | Solo después de validar edad, bienestar, calendario y capacidad familiar |

240 minutos equivalen a 4 horas; cualquier horario Sprint debe usar esa cifra.

### 14.2 Distribución semanal de referencia

| Actividad | Flex | Accelerated | Sprint |
|---|---:|---:|---:|
| StarLessons | 2 h | 3 h | 4 h |
| Voz y StarTalk | 1.5 h | 2.5 h | 4 h |
| Reading y Listening | 1 h | 2 h | 3 h |
| Writing | 1 h | 1.5 h | 2 h |
| StarRepair y StarReview | 2 h | 2 h | 4 h |
| Benchmark y portafolio | 0.5 h | 1 h | 2 h |
| **Total** | **8 h** | **12 h** | **19 h** |

La plataforma personaliza la distribución por brechas, manteniendo carga y pisos.

### 14.3 Cambios de ritmo

Se define un **ciclo de plan de cuatro semanas**:

- Upgrade: puede activarse inmediatamente con prorrateo visible.
- Downgrade: inicia en el siguiente ciclo.
- Cambio académico: recalcula carga y fecha; no borra dominio.
- Sprint: incluye una primera semana de confirmación de carga.
- Sprint no se ofrece automáticamente a 12–14; requiere regla de elegibilidad aprobada por el equipo juvenil.
- Si el alumno no cumple horas, se modifica la fecha proyectada antes de degradar el estándar.

---

## 15. Modelo de datos mínimo

### 15.1 Entidades principales

| Área | Entidades |
|---|---|
| Identidad/familia | users, learner_profiles, guardian_profiles, guardian_learner_links, guardian_invitations, authorized_devices |
| Edad/consentimiento | age_assurance_checks, consent_grants, youth_assents, age_transition_events, privacy_requests |
| Comercio | payers, products, plans, subscriptions, invoices, payments, credits, entitlements |
| Currículo | curriculum_versions, stages, units, competencies, competency_edges |
| Contenido | lesson_contracts, activities, content_assets, content_versions, licenses |
| Evaluación | blueprints, items, item_versions, rubrics, forms, form_items, cut_rules |
| Aprendizaje | enrollments, learning_plans, plan_items, competency_states, review_schedule |
| Sesiones | sessions, session_events, turns, ephemeral_transcript_refs, usage_ledger, incidents |
| Evidencia | evidence, evidence_scores, scorer_runs, mastery_decisions |
| Calidad | human_reviews, review_cases, appeals, overrides, audit_log, model_registry, prompt_versions |
| Salvaguarda | safety_signals, safety_cases, safety_actions, safety_access_log |
| Resultados | stage_gates, certificates, readiness_decisions, official_scores |
| Soporte | support_cases, notifications, delivery_preferences |

### 15.2 Datos obligatorios de una evidencia

- learner_id pseudonimizado.
- competencia y versión.
- tarea, contenido y versión.
- fecha y duración.
- respuesta o referencia al archivo.
- ayudas utilizadas.
- novedad de la tarea.
- condiciones técnicas.
- rúbrica y versión.
- scorer, modelo y prompt.
- scores por dimensión.
- confianza.
- alertas.
- hash del input.
- decisión resultante.

### 15.3 Reglas

- Una versión publicada no cambia.
- Una evidencia histórica siempre apunta a sus versiones originales.
- Toda promoción puede reconstruirse desde eventos.
- Los archivos grandes viven en almacenamiento de objetos, no dentro de la base relacional.
- Identidad personal y datos académicos se separan lógicamente.
- La eliminación de audio no elimina el expediente derivado permitido por la política.
- Un enrollment juvenil activo requiere vínculo, consentimientos y asentimiento vigentes.
- Un pagador no recibe automáticamente permisos de apoderado.
- El audio de práctica juvenil no se persiste por defecto.
- Datos de identidad, aprendizaje, comercio y salvaguarda se separan lógicamente y por permisos.

### 15.4 Eventos de negocio

- learner.registered
- guardian.invited
- guardian.verified
- guardian.linked
- consent.granted
- consent.revoked
- assent.recorded
- diagnostic.started
- diagnostic.section_completed
- diagnostic.completed
- placement.provisional
- placement.confirmed
- human_review.requested
- human_review.completed
- subscription.activated
- lesson.started
- lesson.completed
- voice.session.started
- voice.session.interrupted
- voice.session.ended
- evidence.created
- evidence.scored
- competency.provisional
- competency.mastered
- competency.review_due
- repair.created
- stage_gate.requested
- stage_gate.approved
- readiness.provisional
- readiness.approved
- usage.threshold_reached
- learner.at_risk
- safety.alerted
- safety.triaged
- safety.resolved
- privacy.requested
- age.transitioned_to_adult
- appeal.opened
- certificate.issued

Los consumidores deben ser idempotentes: repetir un evento no duplica cobros, evidencia ni dominio.

---

## 16. Arquitectura técnica recomendada

### 16.1 Estrategia

Para el MVP se recomienda un **monolito modular** con procesos asíncronos, no una red temprana de microservicios. Los límites de dominio se conservan para poder separar componentes cuando el volumen lo justifique.

### 16.2 Diagrama

<svg class="architecture-svg" viewBox="0 0 920 525" role="img" aria-label="Arquitectura de STAR Learning OS 12+">
  <defs>
    <marker id="arrow-star" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#ff6b4a"/>
    </marker>
  </defs>
  <style>
    .n{fill:#eef2ff;stroke:#23305f;stroke-width:2}.n2{fill:#e6fbfa;stroke:#167a82;stroke-width:2}.hot{fill:#fff3ee;stroke:#ff6b4a;stroke-width:2}.t{font:600 15px 'Segoe UI',Arial;fill:#091426;text-anchor:middle}.s{font:12px 'Segoe UI',Arial;fill:#5c6677;text-anchor:middle}.a{stroke:#ff6b4a;stroke-width:2;fill:none;marker-end:url(#arrow-star)}
  </style>
  <rect class="n" x="25" y="20" rx="12" width="250" height="62"/><text class="t" x="150" y="47">Web/PWA juvenil</text><text class="s" x="150" y="68">Alumno 12–17</text>
  <rect class="n" x="335" y="20" rx="12" width="250" height="62"/><text class="t" x="460" y="47">Portal del apoderado</text><text class="s" x="460" y="68">Permisos, progreso y pagos</text>
  <rect class="n" x="645" y="20" rx="12" width="250" height="62"/><text class="t" x="770" y="47">Backoffice</text><text class="s" x="770" y="68">Académico, safety y privacidad</text>
  <rect class="n2" x="240" y="115" rx="12" width="440" height="62"/><text class="t" x="460" y="142">Load Balancer · CDN · Cloud Armor</text><text class="s" x="460" y="163">Identidad familiar y control de acceso</text>
  <rect class="hot" x="240" y="210" rx="12" width="440" height="62"/><text class="t" x="460" y="237">API STAR · NestJS/Fastify</text><text class="s" x="460" y="258">Permisos · orquestación · auditoría · costos</text>
  <rect class="n" x="25" y="315" rx="12" width="250" height="72"/><text class="t" x="150" y="342">Núcleo académico</text><text class="s" x="150" y="363">Contenido · evidencia · dominio</text><text class="s" x="150" y="379">evaluación · readiness</text>
  <rect class="n2" x="335" y="315" rx="12" width="250" height="72"/><text class="t" x="460" y="342">Voice Session Service</text><text class="s" x="460" y="363">WebRTC · sideband</text><text class="s" x="460" y="379">modelo Realtime</text>
  <rect class="hot" x="645" y="315" rx="12" width="250" height="72"/><text class="t" x="770" y="342">Youth Safety Gateway</text><text class="s" x="770" y="363">Política por edad · P0–P3</text><text class="s" x="770" y="379">cola de revisión humana</text>
  <rect class="n" x="25" y="445" rx="12" width="195" height="55"/><text class="t" x="122" y="478">Cloud SQL</text>
  <rect class="n" x="250" y="445" rx="12" width="195" height="55"/><text class="t" x="347" y="470">Cloud Tasks</text><text class="s" x="347" y="489">workers idempotentes</text>
  <rect class="n" x="475" y="445" rx="12" width="195" height="55"/><text class="t" x="572" y="478">Cloud Storage</text>
  <rect class="n2" x="700" y="445" rx="12" width="195" height="55"/><text class="t" x="797" y="470">OpenAI</text><text class="s" x="797" y="489">Realtime y APIs · ZDR</text>
  <path class="a" d="M150 82 L355 115"/><path class="a" d="M460 82 L460 115"/><path class="a" d="M770 82 L565 115"/>
  <path class="a" d="M460 177 L460 210"/>
  <path class="a" d="M350 272 L150 315"/><path class="a" d="M460 272 L460 315"/><path class="a" d="M570 272 L770 315"/>
  <path class="a" d="M150 387 L122 445"/><path class="a" d="M210 387 L347 445"/><path class="a" d="M460 387 L572 445"/><path class="a" d="M520 387 L797 445"/><path class="a" d="M770 387 L797 445"/>
</svg>

### 16.3 Stack tecnológico decidido

- Monorepo: pnpm workspaces y Turborepo.
- Runtime: Node.js LTS y TypeScript estricto, versiones fijadas en lockfile.
- Frontend: Next.js App Router, React, Tailwind, componentes accesibles y PWA.
- Flujos críticos de voz/evaluación: máquina de estados explícita; formularios con React Hook Form y Zod.
- Backend: NestJS con Fastify, REST/OpenAPI y módulos de dominio.
- Base principal: Cloud SQL para PostgreSQL; Prisma para esquema/migraciones/acceso tipado.
- Archivos: Cloud Storage privado, URLs firmadas y lifecycle.
- Procesos: Cloud Tasks y workers idempotentes; Pub/Sub solo cuando exista fan-out real.
- Identidad: Google Cloud Identity Platform más modelo propio de familia, edad, consentimiento y permisos.
- Cloud: Cloud Run, Load Balancer/CDN, Cloud Armor, Secret Manager, KMS y Artifact Registry.
- Voz: OpenAI Realtime por WebRTC con servicio sideband en Cloud Run.
- IA: gateway interno que centraliza modelos, prompts, ZDR, costos, versiones, safety identifiers y fallbacks.
- Observabilidad: OpenTelemetry hacia Cloud Logging, Monitoring y Trace; sin session replay juvenil.
- Analítica: eventos seudónimos; BigQuery después del piloto y sin audio/texto libre.
- Infraestructura: Terraform y CI/CD con GitHub Actions + Workload Identity Federation.

La especificación completa, decisiones de despliegue, módulos y gates se encuentran en **Stack Tecnológico STAR Learning OS 12+ v1.0**.

### 16.4 Fronteras de API conceptuales

- /auth
- /age-assurance
- /guardians
- /family-links
- /profile
- /consents
- /assents
- /diagnostic
- /learning/today
- /path
- /lessons
- /voice/session
- /evidence
- /review
- /assessment
- /progress
- /subscription
- /usage
- /support
- /safety/report
- /privacy-requests
- /human-reviews
- /admin/content
- /admin/assessment
- /admin/quality

La clave de OpenAI nunca llega al navegador. El servidor emite una conexión limitada después de comprobar edad, vínculo, grants, plan, actividad y ZDR; añade un `OpenAI-Safety-Identifier` seudónimo. OpenAI recomienda WebRTC para navegador, claves estándar solo en servidor y sideband para la lógica privada. [WebRTC oficial](https://developers.openai.com/api/docs/guides/realtime-webrtc) · [Controles server-side](https://developers.openai.com/api/docs/guides/realtime-server-controls)

---

## 17. Seguridad, privacidad y protección

### 17.1 Controles obligatorios

- Control de acceso por rol y mínimo privilegio.
- MFA para personal con acceso sensible.
- MFA o step-up para acciones sensibles del apoderado.
- Cifrado en tránsito y reposo.
- Secretos fuera del código.
- Ambientes y proyectos separados para desarrollo, staging y producción.
- Límites de gasto y alertas.
- Registro de accesos a audio, evaluaciones y datos personales.
- Backups cifrados.
- Protección del banco seguro.
- Rate limiting y detección de abuso.
- Idempotencia en pagos y scoring.
- Revisión de dependencias y pruebas de penetración antes de escala.
- WAF, rate limits, dispositivos autorizados y cierre remoto de sesión juvenil.
- Prohibición de copiar datos reales de menores a desarrollo o staging.

OpenAI recomienda proteger claves, separar staging y producción y configurar límites de uso. [Buenas prácticas de producción](https://developers.openai.com/api/docs/guides/production-best-practices)

### 17.2 Privacidad por diseño

- Separar consentimiento de servicio, IA/voz, almacenamiento, transferencia, marketing e investigación.
- Pedir solo los datos necesarios.
- No enviar datos demográficos al scorer.
- Pseudonimizar identificadores enviados a proveedores.
- Dar acceso a descarga, corrección y eliminación conforme a la política.
- No almacenar conversaciones completas de práctica.
- No conservar audio bruto de práctica juvenil por defecto.
- Conservar una muestra de evaluación solo si existe finalidad, base/consentimiento, plazo y acceso aprobados.
- Definir plazos diferentes para práctica, evaluación y expediente.
- Revisar contractualmente tratamiento y residencia de datos.

**Decisión legal requerida:** plazo de evidencia de evaluación y safety. Para práctica juvenil el default cambia a no persistir audio. ZDR del proveedor y retención interna son controles independientes.

### 17.3 Seguridad pedagógica

- Identificar claramente que el Mentor es IA.
- Política para contenido sensible, acoso, crisis y uso indebido.
- Escalamiento humano fuera del rol educativo.
- Moderación y análisis de incidentes sin convertir al Mentor en profesional clínico.
- Safety Gateway sobre transcripciones y reglas propias; Moderation no clasifica audio directamente.
- Prohibir secretos, contacto externo, romanticismo, dependencia afectiva, solicitud de PII e inferencia emocional.
- Botón juvenil visible, severidad P0–P3, kill switch y responsable humano de salvaguarda.
- Alumnos 12–13 solo con ZDR aprobado y verificado.
- Evaluación significativa de menores con revisión humana capaz de detener, corregir o invalidar.

---

## 18. Requisitos no funcionales

Los siguientes son objetivos iniciales sujetos al piloto.

| Área | Objetivo MVP |
|---|---|
| Disponibilidad | 99.5% mensual; 99.9% tras estabilización |
| Carga de páginas | p95 menor a 2.5 s en recorridos principales |
| Inicio de sesión de voz | p95 menor a 5 s en conexión compatible |
| Primera respuesta de audio | objetivo p95 menor a 2 s después del turno |
| Sesiones de voz completadas técnicamente | 97% o más |
| Autosave | Después de cada actividad o turno válido |
| Recuperación de caída | Volver al último checkpoint |
| Accesibilidad | WCAG 2.2 AA en flujos críticos |
| Navegadores | Dos versiones recientes de Chrome, Edge y Safari |
| Dispositivos | Escritorio, Android e iOS mediante web adaptable |
| RPO | 15 minutos para datos operativos |
| RTO | 4 horas en MVP |
| Auditoría | 100% de cambios y decisiones de alta consecuencia |
| Escala | Prueba al doble de la concurrencia prevista del piloto |
| Voz 12–13 sin ZDR verificado | 0 sesiones |
| Voz juvenil sin grants vigentes | 0 sesiones |
| Decisión significativa juvenil sin revisión requerida | 0 decisiones finales |
| Acceso a audio/safety sin propósito auditado | 0 accesos |
| Borrado de objetos temporales | Automático, comprobable y alertado ante fallo |

No se publica el objetivo de latencia como garantía hasta medirlo por país, dispositivo y red.

---

## 19. Métricas y tablero de dirección

### 19.1 North Star

> Porcentaje de alumnos elegibles que logran avance seguro y dominio verificable hasta readiness interno y, cuando existe resultado consentido, TOEFL oficial 4.5/B2.

Un resultado de aprendizaje no compensa un incidente grave de privacidad o salvaguarda sin resolver. La métrica se interpreta junto con guardrails de seguridad.

### 19.2 Aprendizaje

- Competencias dominadas por 100 horas efectivas.
- Tiempo medio hasta dominio.
- Retención a 30 y 90 días.
- Éxito en transferencia.
- Competencias reabiertas.
- Progreso por nivel inicial y plan.

### 19.3 Evaluación

- Acuerdo humano–humano.
- Acuerdo IA–humano.
- Error por dimensión de Speaking/Writing.
- Reubicación tras la semana de calibración.
- Dificultad y discriminación de ítems.
- Casos no puntuables.
- Apelaciones y overrides.
- Acuerdo IA–humano y correcciones de placement por banda de edad, acento y dispositivo.
- Falsos positivos de integridad y decisiones juveniles detenidas/corregidas.

### 19.4 TOEFL

- Error entre predicción y resultado oficial.
- Sesgo por sección.
- Falsos ready y falsos no-ready.
- Tiempo entre simulación y examen oficial.
- Tasa de logro por nivel inicial.

### 19.5 Experiencia y negocio

- Preview → StarMap 360.
- Diagnóstico → pago.
- Activación en siete días.
- Horas previstas frente a realizadas.
- Retención mensual.
- Abandono y reactivación.
- Costo por hora efectiva.
- Costo de voz por plan.
- Margen de contribución.
- Tickets por 100 alumnos.
- Latencia y fallos por dispositivo.
- Activación de apoderado → alumno y abandono del onboarding familiar.
- Uso nocturno, pausas, descansos y carga escolar por banda etaria.

### 19.6 Protección, privacidad y familia

- Outputs dañinos o fuera de límites por 1,000 sesiones.
- Solicitudes indebidas de PII, secretos o contacto externo.
- Casos por severidad y tiempo a detección, triage y resolución.
- Falsos positivos/negativos de moderación revisados.
- Consentimientos verificables, revocaciones y sesiones bloqueadas correctamente.
- Accesos a audio/safety y cumplimiento de exportación, oposición y borrado.
- Estado ZDR comprobado y cualquier intento de usar un endpoint no permitido.
- Satisfacción del joven y del apoderado medida por separado.

No se presentan promedios sin tamaño de muestra, dispersión y abandono.

---

## 20. Plan de construcción

Las duraciones dependen del equipo y de la cantidad de contenido listo. Software y currículo deben avanzar en paralelo.

### Fase 0 — Arquitectura, protección y especificación, 4–6 semanas

- Confirmar cohorte 12–13/14–17, mercado y modelo comercial.
- Normalizar horas académicas.
- Definir grafo B1→B2.
- Aprobar rúbricas y reglas provisionales.
- Solicitar/confirmar ZDR para el proyecto de menores.
- Diseñar Family, AgeAssurance, Consent, Assent y transición a 18.
- Realizar evaluación de impacto de privacidad e IA.
- Aprobar protocolo de salvaguarda y revisión pedagógica humana.
- Prototipar voz y contenidos por banda de edad.
- Cerrar mapa de datos, transferencia y retención.

**Gate:** ninguna contradicción P0 abierta; responsables, consentimientos, ZDR y protocolo definidos para la cohorte que entrará.

### Fase 1 — Corte vertical juvenil, 8–12 semanas

Construir el recorrido de un joven B1 y su apoderado en Accelerated:

- Cuenta adulta, perfil juvenil, verificación, consentimiento y asentimiento.
- Pago y control de plan por el apoderado.
- Prueba técnica.
- Mini StarMap juvenil con placement provisional.
- Una unidad completa con contexto apropiado a la edad.
- Una misión de voz con ZDR, sideband y Safety Gateway.
- StarRepair.
- StarReview.
- Evidencia y dominio.
- Mini StarProof con revisión pedagógica humana.
- Panel juvenil, resumen familiar y consola básica de safety/calidad.

**Objetivo:** demostrar que el sistema completo funciona de punta a punta, no cubrir todo B1→B2.

### Fase 2 — MVP de piloto, 14–20 semanas adicionales

- StarMap 360 juvenil modular.
- Ruta B1→B2 priorizada.
- Backoffice de contenido.
- Assessment separado y Human Review.
- Pagos, entitlements, vínculos y dispositivos.
- Panel juvenil y portal del apoderado.
- Soporte familiar, privacidad, safeguarding y auditoría.
- Observabilidad y costos.
- Contenido suficiente para 8–12 semanas de piloto.

**Piloto alfa:** 20–30 familias, revisión humana total y sin claims de eficacia.

### Fase 3 — Piloto académico, 12–16 semanas

- 80–120 familias/alumnos.
- Inicio 14–17 si ZDR o el flujo 12–13 todavía no superan gates; 12–13 únicamente después de cumplirlos.
- Pretest/postest independiente.
- Calibración de placement y scorers.
- Ajuste de carga y retención.
- Primeros resultados oficiales consentidos.
- Auditoría de sesgo técnico.

### Fase 4 — Validación y escala

- 300 o más alumnos acumulados.
- Expansión del banco.
- Formas paralelas.
- Automatización parcial solo de práctica de baja consecuencia; las decisiones significativas juveniles mantienen supervisión.
- Garantía condicionada solo si los datos la permiten.
- Extensión A0→B1 y posteriormente C1.

### Estimación realista

- Corte vertical juvenil demostrable: 3–4 meses.
- MVP pagado limitado 12+: 6–9 meses.
- Primera evidencia académica seria: 9–12 meses.
- Plataforma y currículo completos A0→B2: probablemente 12–18 meses.

Estas cifras no son cotización; deben recalcularse con equipo, presupuesto y contenido disponible.

---

## 21. Alcance del MVP

### Incluido

- Jóvenes de 12–17 con experiencias 12–13 y 14–17; 12–13 condicionado a ZDR y gates completos.
- Cuenta de apoderado, perfil juvenil, verificación de edad/vínculo, consentimientos y asentimiento.
- Español como interfaz.
- B1→B2.
- Accelerated como cohorte principal.
- Flex como alternativa; Sprint solo si se valida la elegibilidad por edad/carga.
- Web/PWA.
- Voz Realtime con sideband, Safety Gateway y audio de práctica no persistente.
- StarMap juvenil modular y placement revisado.
- StarLessons, StarTalk, StarRepair, StarReview y StarProof.
- Pago adulto, cupos, progreso, soporte familiar y privacidad.
- Revisión pedagógica humana de decisiones significativas.
- Backoffice mínimo, safeguarding y auditoría.

### Excluido

- Apps nativas.
- A0→B1 completo.
- C1.
- Varios países y monedas en la misma salida.
- TOEFL oficial incluido.
- Garantía de score.
- CAT/IRT plenamente adaptativo.
- Corrección completamente automática de alta consecuencia.
- Comunidad social y clases grupales.
- DMs, perfiles públicos, rankings globales y compras dentro del flujo juvenil.
- Webcam, biometría, reconocimiento facial, proctoring o inferencia de emociones.
- Audio juvenil persistente por defecto y datos juveniles para marketing/entrenamiento general.
- Convenio ETS.

---

## 22. Plan de pruebas y gates de lanzamiento

### 22.1 Pruebas de producto

- Registro y recuperación.
- Invitación, verificación del apoderado, vínculo, consentimiento y asentimiento.
- Revocación durante una sesión, dispositivo perdido y transición al cumplir 18.
- Pagador distinto del apoderado y más de un vínculo familiar.
- Diagnóstico incompleto.
- Pago aprobado, rechazado, duplicado y reembolsado.
- Upgrade y downgrade.
- Voz con ruido, latencia, caída y reconexión.
- Consumo de minutos.
- Lección demasiado fácil o difícil.
- Reporte de contenido incorrecto.
- Ausencia y reactivación.
- Accesibilidad con teclado y lector.
- Panel del apoderado sin exposición de conversaciones completas.
- Exportación, oposición, supresión y lifecycle de objetos.

### 22.2 Pruebas de IA

- Cumplimiento del contrato.
- Cambio indebido de idioma.
- Corrección excesiva.
- Alucinación pedagógica.
- Desvío de misión.
- Llamadas de herramientas inválidas.
- Intento de acceder a banco seguro.
- Prompt injection del alumno.
- Respuestas peligrosas o fuera del rol.
- Solicitud de secretos, contacto, fotos, dirección, colegio, teléfono o redes.
- Romanticismo, sexualización, dependencia emocional e inferencia de emociones.
- Grooming, sextorsión, abuso, autolesión, violencia, bullying y amenazas.
- Falsos positivos: inglés correcto que menciona temas sensibles.
- Consistencia entre versiones.

OpenAI recomienda definir objetivo, dataset, métrica, comparación y evaluación continua en cada cambio. [Evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices)

### 22.3 Gold sets

Mantener conjuntos versionados de:

- 200+ casos de Tutor.
- 200+ sesiones o fragmentos de voz.
- 100+ respuestas de Speaking.
- 100+ respuestas de Writing.
- Casos de acentos y dispositivos.
- Casos adversariales.
- Casos de baja confianza.
- Casos por banda 12–13, 14–15 y 16–17.
- 100+ pruebas de PII, límites relacionales y protección infantil.

Los números crecerán con el piloto. Un cambio de modelo, prompt o rúbrica debe ejecutarse sobre el gold set antes de producción.

### 22.4 Gates

No se lanza el piloto pagado si:

- El progreso puede perderse.
- Tutor y Examiner comparten permisos o claves.
- El diagnóstico incompleto promete una fecha.
- Una caída descuenta doble voz.
- No existe apelación.
- No se reconstruye una decisión académica.
- No existe borrado/exportación según política.
- Los flujos críticos no cumplen accesibilidad.
- No hay límites y alertas de gasto.
- Un cambio de IA puede desplegarse sin regresión ni rollback.
- Una sesión 12–13 puede crearse sin ZDR aprobado/verificado.
- Una sesión juvenil puede comenzar sin vínculo, consentimiento o asentimiento vigentes.
- El sistema guarda audio de práctica juvenil por defecto.
- Placement, promoción, integridad, readiness o certificado de un menor puede finalizar sin el review requerido.
- No existe responsable, protocolo, kill switch y simulacro de salvaguarda.
- No se probó el acceso familiar, la revocación y la transición a 18.
- No se completaron la evaluación de impacto y revisión legal peruana.
- No se registró/revisó el banco de datos y flujo internacional aplicable.

---

## 23. Ajustes incorporados en Metodología STAR v1.5

Para mantener la metodología y la plataforma alineadas se aplicaron estos ajustes:

1. **Horas:** S3+S4, tabla comercial y alcance de contenido muestran cifras diferentes.
2. **Sprint:** la voz incluida es 240 minutos, equivalentes a 4 horas.
3. **Dominio:** reemplazar “85% de críticas” por 100% críticas y 85% complementarias.
4. **Benchmark:** usar pisos por habilidad, no solo 80% promedio.
5. **Certificado:** aprobar puertas hasta S4, no necesariamente toda actividad opcional.
6. **Bloque:** definirlo como ciclo de plan de cuatro semanas.
7. **100% IA:** toda enseñanza visible es IA; resultados de alta consecuencia pueden estar provisionalmente bajo revisión humana.
8. **Placement:** iniciar multietapa; reservar CAT/IRT para un banco calibrado.
9. **Certificado y readiness:** emitirlos como decisiones/documentos diferentes.
10. **Predicción:** llamar simulación y estimación hasta calibrarla contra TOEFL oficial.
11. **Público:** diseñar una ruta juvenil 12–17, con variantes 12–13 y 14–17 y flujo 18+ separado.
12. **100% IA:** significa enseñanza visible; decisiones educativas significativas, privacidad y salvaguarda conservan responsabilidad humana.
13. **Familia:** apoderado, alumno y pagador son identidades y permisos distintos.
14. **Voz:** práctica juvenil sin audio persistente por defecto; ZDR es gate para 12–13.
15. **Contenido:** mismo estándar B2, contextos adecuados a edad y sin medir experiencia laboral/adulta.
16. **Carga:** Sprint no se vende automáticamente a 12–14 y debe validar bienestar/calendario.

---

## 24. Registro de decisiones pendientes

### P0 — Antes de diseñar pantallas finales

1. ¿El piloto juvenil empieza con 14–17 o incluye 12–13 desde el primer día una vez aprobados todos los gates?
2. ¿Se adopta apoderado obligatorio y asentimiento para todo alumno menor de 18?
3. ¿Starbiz autoriza solicitar/contratar ZDR antes de admitir 12–13?
4. ¿Quién verifica al apoderado y con qué nivel de evidencia mínima?
5. ¿Qué verá el apoderado: resumen, carga, hitos, pagos y alertas; sin conversación completa por defecto?
6. ¿Quién ocupa revisión pedagógica juvenil y salvaguarda, con qué horario y SLA?
7. ¿El MVP acepta B1 confirmado y StarMap Preview es informativo hasta verificar edad/permisos?
8. ¿Se pilota Accelerated y Flex, dejando Sprint 12–14 sujeto a validación?
9. ¿Cuántas familias, concurrencia, presupuesto y fecha objetivo tendrá el piloto?
10. ¿Se aprueba no guardar audio juvenil de práctica y definir aparte evaluación/safety?
11. ¿El TOEFL oficial se paga por separado?
12. ¿Qué política habrá para pausa, cancelación, mora, devolución y reactivación del pagador adulto?

### P1 — Antes del piloto pagado

13. ¿Qué proveedor de pago y moneda se utilizarán?
14. ¿Qué navegadores y calidad mínima de red serán compatibles?
15. ¿Qué adaptaciones de accesibilidad se ofrecerán?
16. ¿Qué variedades de inglés y acentos usará el Mentor?
17. ¿Quiénes ocupan Dirección Académica, Evaluación, IA, Privacidad, Salvaguarda y Soporte Familiar?
18. ¿Cuál es el procedimiento de apelación del joven y del apoderado?
19. ¿Qué contenido y marcas TOEFL se licenciarán o solo se enlazarán?
20. ¿Cómo se verificará un resultado oficial subido por la familia?
21. ¿Cómo se resuelven múltiples apoderados, pagador distinto, vínculo vencido y transición a 18?
22. ¿Se prohíbe por defecto reutilizar datos juveniles para investigación/entrenamiento general?

### P2 — Después de validar el núcleo

23. Apps móviles nativas.
24. A0→B1 y C1.
25. Expansión internacional.
26. Garantía comercial.
27. Convenios y B2B/colegios.
28. Funciones sociales, solo si existe necesidad pedagógica y diseño de protección propio.

---

## 25. Recomendación ejecutiva

La plataforma no debe comenzar construyendo decenas de pantallas ni un chatbot general. La primera inversión debe producir un corte vertical:

> Un joven B1 y su apoderado completan verificación, consentimiento y diagnóstico; el alumno recibe ruta, aprende, conversa de forma protegida, repara un error y ve evidencia auditable, mientras una decisión significativa pasa por revisión humana y el adulto recibe un resumen apropiado.

Si ese recorrido funciona, se puede multiplicar contenido, niveles y planes. Si no funciona, ampliar el catálogo solo amplifica el problema.

El núcleo diferenciador de Starbiz será:

`currículo propio + evidencia + dominio + voz natural + familia + protección infantil + evaluación responsable + mejora versionada`

---

## 26. Fuentes técnicas oficiales consultadas

- [OpenAI Under 18 API Guidance](https://developers.openai.com/api/docs/guides/safety-checks/under-18-api-guidance)
- [OpenAI Data controls y Zero Data Retention](https://developers.openai.com/api/docs/guides/your-data)
- [OpenAI Voice agents](https://developers.openai.com/api/docs/guides/voice-agents)
- [OpenAI Realtime con WebRTC](https://developers.openai.com/api/docs/guides/realtime-webrtc)
- [OpenAI Realtime conversations](https://developers.openai.com/api/docs/guides/realtime-conversations)
- [OpenAI server-side controls](https://developers.openai.com/api/docs/guides/realtime-server-controls)
- [OpenAI Voice activity detection](https://developers.openai.com/api/docs/guides/realtime-vad)
- [OpenAI Managing Realtime costs](https://developers.openai.com/api/docs/guides/realtime-costs)
- [OpenAI Production best practices](https://developers.openai.com/api/docs/guides/production-best-practices)
- [OpenAI Evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices)
- [OpenAI Moderation](https://developers.openai.com/api/docs/guides/moderation)
- [OpenAI Safety best practices](https://developers.openai.com/api/docs/guides/safety-best-practices)
- [GPT-Realtime-2.1 mini](https://developers.openai.com/api/docs/models/gpt-realtime-2.1-mini)
- [Perú: D.S. 016-2024-JUS, Reglamento de Protección de Datos Personales](https://epdoc2.elperuano.pe/EpPo/VistaNLSE.asp?Referencias=MjM0OTY1My0xMjAyNDExMzA%3D)
- [Perú: D.S. 115-2025-PCM, Reglamento de IA](https://www3.congreso.gob.pe/Docs/DGP/DIDP/files/ds_115-2025-pcm.pdf)
- [Stack Tecnológico STAR Learning OS 12+ v1.0](./Stack_Tecnologico_STAR_12Plus_v1.md)
