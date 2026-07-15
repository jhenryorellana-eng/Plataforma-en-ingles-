/**
 * Seed del corte vertical: English Path B1→B2 (muestra curricular) + familia demo.
 * Idempotente: puede ejecutarse varias veces sin duplicar datos.
 * El currículo completo B1→B2 es trabajo del equipo académico (tasks/todo.md, bloqueador #9).
 */
import { PrismaClient, type Prisma } from '@prisma/client';

const prisma = new PrismaClient();

const NOTICE_VERSION = '2026-07';

async function main(): Promise<void> {
  // ---------- Programa y versión publicada ----------
  const program = await prisma.languageProgram.upsert({
    where: { code: 'english-path' },
    update: { status: 'active' },
    create: {
      code: 'english-path',
      name: 'English Path',
      targetLanguage: 'en',
      defaultSupportLanguage: 'es',
      defaultInterfaceLocale: 'es-PE',
      defaultTargetVariety: 'en-US',
      minimumAge: 12,
      status: 'active',
    },
  });

  const version = await prisma.programVersion.upsert({
    where: { programId_version: { programId: program.id, version: '2026.1-b1-pilot' } },
    update: { status: 'published', publishedAt: new Date() },
    create: {
      programId: program.id,
      version: '2026.1-b1-pilot',
      status: 'published',
      publishedAt: new Date(),
      contentHash: 'sha256:vertical-slice-seed',
    },
  });

  await prisma.programTrack.upsert({
    where: { programVersionId_code: { programVersionId: version.id, code: 'toefl-45' } },
    update: {},
    create: {
      programVersionId: version.id,
      code: 'toefl-45',
      name: 'Meta TOEFL iBT 4.5 / B2',
      qualificationTarget: 'TOEFL_IBT_2026:4.5',
    },
  });

  // ---------- Etapa y unidad ----------
  const stage = await prisma.stage.upsert({
    where: { programVersionId_code: { programVersionId: version.id, code: 'S3' } },
    update: {},
    create: {
      programVersionId: version.id,
      code: 'S3',
      name: 'S3 — Independence',
      cefrFrom: 'B1',
      cefrTo: 'B2',
      orderIndex: 1,
    },
  });

  const unit = await prisma.unit.upsert({
    where: { programVersionId_code: { programVersionId: version.id, code: 'EN-B1-U01' } },
    update: {},
    create: {
      programVersionId: version.id,
      stageId: stage.id,
      code: 'EN-B1-U01',
      name: 'University Life',
      theme: 'Anuncios académicos, correos formales y trámites universitarios',
      orderIndex: 1,
    },
  });

  // ---------- Rúbrica de Writing ----------
  const rubric = await prisma.rubricVersion.upsert({
    where: {
      programVersionId_code_version: { programVersionId: version.id, code: 'WR-EMAIL-B1', version: 1 },
    },
    update: {},
    create: {
      programVersionId: version.id,
      code: 'WR-EMAIL-B1',
      name: 'Correo formal B1',
      version: 1,
      dimensions: {
        task_completion: { floor: 0.6, description: 'Cumple el propósito y los elementos requeridos' },
        organization: { floor: 0.5, description: 'Saludo, cuerpo ordenado y cierre' },
        language_range: { floor: 0.5, description: 'Vocabulario y estructuras del nivel' },
      } as Prisma.InputJsonObject,
    },
  });

  // ---------- Competencias ----------
  const competencyDefs = [
    {
      code: 'LIS.B1.ANN.01',
      descriptor: 'Escucha un anuncio universitario e identifica propósito, fechas y acciones requeridas',
      skill: 'listening',
      criticality: 'critical',
    },
    {
      code: 'RD.B1.CAMP.01',
      descriptor: 'Lee avisos y correos académicos e infiere propósito y detalles clave',
      skill: 'reading',
      criticality: 'critical',
    },
    {
      code: 'LU.B1.PAST.01',
      descriptor: 'Usa tiempos pasados para narrar experiencias académicas con precisión',
      skill: 'language_use',
      criticality: 'critical',
    },
    {
      code: 'WR.B1.EMAIL.01',
      descriptor: 'Redacta un correo formal solicitando información o aclaración a su centro de estudios',
      skill: 'writing',
      criticality: 'critical',
      dimensionFloors: { task_completion: 0.6, organization: 0.5, language_range: 0.5 },
    },
    {
      code: 'SPK.B1.INT.01',
      descriptor: 'Sostiene una conversación con personal administrativo para resolver un trámite',
      skill: 'speaking',
      criticality: 'critical',
    },
    {
      code: 'VOC.B1.UNI.01',
      descriptor: 'Comprende y usa vocabulario de la vida universitaria (deadline, enrollment, scholarship...)',
      skill: 'language_use',
      criticality: 'complementary',
    },
  ] as const;

  const competencies: Record<string, string> = {};
  for (const def of competencyDefs) {
    const competency = await prisma.competency.upsert({
      where: { programVersionId_code: { programVersionId: version.id, code: def.code } },
      update: {},
      create: {
        programVersionId: version.id,
        stageId: stage.id,
        code: def.code,
        descriptor: def.descriptor,
        skill: def.skill,
        cefrLevel: 'B1',
        criticality: def.criticality,
        dimensionFloors: (('dimensionFloors' in def ? def.dimensionFloors : {}) ?? {}) as Prisma.InputJsonObject,
      },
    });
    competencies[def.code] = competency.id;
  }

  await prisma.competencyEdge.upsert({
    where: {
      fromCompetencyId_toCompetencyId_kind: {
        fromCompetencyId: competencies['VOC.B1.UNI.01'],
        toCompetencyId: competencies['LIS.B1.ANN.01'],
        kind: 'supports',
      },
    },
    update: {},
    create: {
      fromCompetencyId: competencies['VOC.B1.UNI.01'],
      toCompetencyId: competencies['LIS.B1.ANN.01'],
      kind: 'supports',
    },
  });

  // ---------- Lecciones ----------
  interface LessonDef {
    code: string;
    objective: string;
    orderIndex: number;
    immersionRatio: number;
    timeboxSeconds: number;
    mentorMode: string;
    competencyCodes: string[];
  }
  const lessonDefs: LessonDef[] = [
    {
      code: 'EN-B1-U01-L01',
      objective: 'Entender un anuncio de la universidad e identificar qué debes hacer y cuándo',
      orderIndex: 1,
      immersionRatio: 0.7,
      timeboxSeconds: 900,
      mentorMode: 'tutor',
      competencyCodes: ['LIS.B1.ANN.01', 'RD.B1.CAMP.01', 'VOC.B1.UNI.01'],
    },
    {
      code: 'EN-B1-U01-L02',
      objective: 'Responder por correo formal a tu universidad pidiendo una aclaración',
      orderIndex: 2,
      immersionRatio: 0.7,
      timeboxSeconds: 1200,
      mentorMode: 'tutor',
      competencyCodes: ['WR.B1.EMAIL.01', 'LU.B1.PAST.01'],
    },
    {
      code: 'EN-B1-U01-L03',
      objective: 'Conversar con la oficina de registro para resolver un problema de matrícula',
      orderIndex: 3,
      immersionRatio: 0.8,
      timeboxSeconds: 900,
      mentorMode: 'talk_partner',
      competencyCodes: ['SPK.B1.INT.01'],
    },
  ];

  const lessons: Record<string, string> = {};
  for (const def of lessonDefs) {
    const lesson = await prisma.lessonContract.upsert({
      where: { programVersionId_code: { programVersionId: version.id, code: def.code } },
      update: {},
      create: {
        programVersionId: version.id,
        unitId: unit.id,
        code: def.code,
        objective: def.objective,
        orderIndex: def.orderIndex,
        immersionRatio: def.immersionRatio,
        timeboxSeconds: def.timeboxSeconds,
        mentorMode: def.mentorMode,
        evidenceRequirements: { minimumActivities: 2 } as Prisma.InputJsonObject,
      },
    });
    lessons[def.code] = lesson.id;
    for (const competencyCode of def.competencyCodes) {
      await prisma.lessonCompetency.upsert({
        where: {
          lessonContractId_competencyId: {
            lessonContractId: lesson.id,
            competencyId: competencies[competencyCode],
          },
        },
        update: {},
        create: { lessonContractId: lesson.id, competencyId: competencies[competencyCode] },
      });
    }
  }

  // ---------- Actividades ----------
  const announcement =
    'Attention all students: the deadline to register for the international exchange program has been moved to Friday, March 20th. ' +
    'Students who already submitted their application must attend a short interview at the International Office, Room 204, next week. ' +
    'Please bring your student ID and a copy of your transcript.';

  interface ActivityDef {
    code: string;
    lessonCode: string;
    competencyCode: string;
    kind: 'mcq' | 'gap_fill' | 'writing_prompt' | 'voice_mission';
    skill: 'reading' | 'listening' | 'speaking' | 'writing' | 'language_use';
    orderIndex: number;
    isTransferVariant?: boolean;
    supportLevel?: 'guided' | 'independent';
    rubric?: boolean;
    prompt: Record<string, unknown>;
    answerKey: Record<string, unknown>;
  }

  const activityDefs: ActivityDef[] = [
    {
      code: 'EN-B1-U01-L01-A01',
      lessonCode: 'EN-B1-U01-L01',
      competencyCode: 'LIS.B1.ANN.01',
      kind: 'mcq',
      skill: 'listening',
      orderIndex: 1,
      supportLevel: 'guided',
      prompt: {
        instructions: 'Lee (o escucha) el anuncio y responde: ¿cuál es el propósito principal?',
        transcript: announcement,
        stem: 'What is the main purpose of the announcement?',
        options: [
          'To cancel the exchange program',
          'To inform students about a new deadline and next steps',
          'To invite students to a graduation ceremony',
          'To announce new library hours',
        ],
      },
      answerKey: {
        correctIndex: 1,
        explanation: 'El anuncio informa el cambio de fecha límite (March 20th) y los siguientes pasos.',
      },
    },
    {
      code: 'EN-B1-U01-L01-A02',
      lessonCode: 'EN-B1-U01-L01',
      competencyCode: 'LIS.B1.ANN.01',
      kind: 'mcq',
      skill: 'listening',
      orderIndex: 2,
      prompt: {
        instructions: 'Según el anuncio, ¿qué deben llevar los estudiantes a la entrevista?',
        transcript: announcement,
        stem: 'What must students bring to the interview?',
        options: [
          'A letter from their parents',
          'Their passport and a photo',
          'Their student ID and a copy of their transcript',
          'Nothing, just attend',
        ],
      },
      answerKey: {
        correctIndex: 2,
        explanation: 'El anuncio pide "your student ID and a copy of your transcript".',
      },
    },
    {
      code: 'EN-B1-U01-L01-A03',
      lessonCode: 'EN-B1-U01-L01',
      competencyCode: 'RD.B1.CAMP.01',
      kind: 'mcq',
      skill: 'reading',
      orderIndex: 3,
      isTransferVariant: true,
      prompt: {
        instructions: 'Transferencia: un contexto nuevo. Lee el aviso y responde.',
        transcript:
          'Science Club members: our field trip to the natural history museum is confirmed for Saturday. ' +
          'The bus leaves at 8:00 a.m. sharp from the main gate. If you have not paid the entrance fee yet, ' +
          'please do so at the school office before Thursday.',
        stem: 'What should members do if they have not paid yet?',
        options: [
          'Pay on the bus on Saturday',
          'Pay at the school office before Thursday',
          'Pay at the museum entrance',
          'Ask the teacher for a discount',
        ],
      },
      answerKey: {
        correctIndex: 1,
        explanation: 'El aviso indica pagar en la oficina de la escuela antes del jueves.',
      },
    },
    {
      code: 'EN-B1-U01-L01-A04',
      lessonCode: 'EN-B1-U01-L01',
      competencyCode: 'VOC.B1.UNI.01',
      kind: 'gap_fill',
      skill: 'language_use',
      orderIndex: 4,
      prompt: {
        instructions: 'Completa con la palabra correcta del vocabulario universitario.',
        text: 'The ____ to submit the scholarship application is next Monday. After that, the office will not accept any ____ documents.',
        gaps: 2,
        hints: ['fecha límite', 'atrasados / tardíos'],
      },
      answerKey: { accepted: [['deadline'], ['late']] },
    },
    {
      code: 'EN-B1-U01-L02-A01',
      lessonCode: 'EN-B1-U01-L02',
      competencyCode: 'LU.B1.PAST.01',
      kind: 'gap_fill',
      skill: 'language_use',
      orderIndex: 1,
      supportLevel: 'guided',
      prompt: {
        instructions: 'Completa la narración con el pasado correcto del verbo entre paréntesis.',
        text: 'Last semester I ____ (miss) the enrollment deadline because I ____ (not/check) my university email.',
        gaps: 2,
        hints: ['pasado simple', 'pasado negativo'],
      },
      answerKey: { accepted: [['missed'], ["didn't check", 'did not check']] },
    },
    {
      code: 'EN-B1-U01-L02-A02',
      lessonCode: 'EN-B1-U01-L02',
      competencyCode: 'WR.B1.EMAIL.01',
      kind: 'writing_prompt',
      skill: 'writing',
      orderIndex: 2,
      rubric: true,
      prompt: {
        instructions:
          'Escribe un correo (60–120 palabras) a la Oficina Internacional. Pregunta por la nueva fecha límite del programa de intercambio y qué documentos necesitas. Incluye saludo formal, tu consulta y agradecimiento.',
        scenario: 'Recibiste el anuncio del programa de intercambio pero no estás seguro de la fecha.',
        minWords: 60,
      },
      answerKey: {
        rubricSpec: {
          minWords: 60,
          requiredElements: ['dear', 'deadline', 'thank'],
        },
      },
    },
    {
      code: 'EN-B1-U01-L02-A03',
      lessonCode: 'EN-B1-U01-L02',
      competencyCode: 'LU.B1.PAST.01',
      kind: 'mcq',
      skill: 'language_use',
      orderIndex: 3,
      isTransferVariant: true,
      prompt: {
        instructions: 'Transferencia: elige la forma correcta en un contexto nuevo.',
        stem: 'When I arrived at the lab, the experiment ____ already ____.',
        options: ['has / started', 'had / started', 'was / start', 'did / start'],
      },
      answerKey: {
        correctIndex: 1,
        explanation: 'Pasado perfecto: la acción ocurrió antes de otra acción pasada (had started).',
      },
    },
    {
      code: 'EN-B1-U01-L03-A01',
      lessonCode: 'EN-B1-U01-L03',
      competencyCode: 'SPK.B1.INT.01',
      kind: 'voice_mission',
      skill: 'speaking',
      orderIndex: 1,
      prompt: {
        objective: 'Resolver un problema de matrícula conversando con la oficina de registro',
        scenario:
          'You are a student. Your name appears as NOT enrolled in the English course you registered for. Talk to the registrar (the Mentor), explain the problem, answer their questions, and find out what you must do.',
        openingLine: "Good morning! Registrar's office, how can I help you today?",
        vocabulary: ['enrollment', 'course code', 'deadline', 'confirmation email', 'schedule'],
        mockScript: [
          "Good morning! Registrar's office, how can I help you today?",
          'I see. Can you tell me your course code and when you registered?',
          'Thank you. It seems your payment was received after the deadline, so the system did not confirm your seat.',
          'Yes, there is a solution: you can submit a late-enrollment form before Friday. Do you know where to find it?',
          'Exactly, at the student portal. Anything else I can help you with?',
          'Perfect. Remember: submit the form before Friday. Have a great day!',
        ],
      },
      answerKey: { scoring: 'speaking evidence llega por pipeline de evaluación, no por esta actividad' },
    },
  ];

  for (const def of activityDefs) {
    await prisma.activity.upsert({
      where: { programVersionId_code: { programVersionId: version.id, code: def.code } },
      update: {},
      create: {
        programVersionId: version.id,
        lessonContractId: lessons[def.lessonCode],
        competencyId: competencies[def.competencyCode],
        rubricVersionId: def.rubric ? rubric.id : null,
        code: def.code,
        kind: def.kind,
        skill: def.skill,
        orderIndex: def.orderIndex,
        isTransferVariant: def.isTransferVariant ?? false,
        supportLevel: def.supportLevel ?? 'independent',
        prompt: def.prompt as Prisma.InputJsonObject,
        answerKey: def.answerKey as Prisma.InputJsonObject,
      },
    });
  }

  // ---------- Ítems de diagnóstico (router multietapa simplificado) ----------
  const diagnosticDefs = [
    {
      code: 'DIAG-RD-01',
      skill: 'reading',
      level: 'A2',
      stem: 'The library opens ____ 9 a.m. every day.',
      options: ['at', 'on', 'in', 'by'],
      correctIndex: 0,
    },
    {
      code: 'DIAG-RD-02',
      skill: 'reading',
      level: 'B1',
      stem: '"All visitors must sign in at reception." This means visitors…',
      options: ['can sign if they want', 'are required to sign', 'should avoid reception', 'must pay at reception'],
      correctIndex: 1,
    },
    {
      code: 'DIAG-RD-03',
      skill: 'reading',
      level: 'B1',
      stem: 'The notice says the workshop was "postponed". The workshop…',
      options: ['was cancelled forever', 'will happen later than planned', 'already happened', 'is happening now'],
      correctIndex: 1,
    },
    {
      code: 'DIAG-RD-04',
      skill: 'reading',
      level: 'B2',
      stem: '"Applicants who fail to provide transcripts will not be considered." Who WILL be considered?',
      options: [
        'Everyone who applies',
        'Only applicants who provide transcripts',
        'Applicants without transcripts',
        'No one',
      ],
      correctIndex: 1,
    },
    {
      code: 'DIAG-LIS-01',
      skill: 'listening',
      level: 'A2',
      stem: '(Anuncio) "The bus to the museum leaves at ten thirty." ¿A qué hora sale el bus?',
      options: ['10:13', '10:30', '13:00', '10:00'],
      correctIndex: 1,
    },
    {
      code: 'DIAG-LIS-02',
      skill: 'listening',
      level: 'B1',
      stem: '(Anuncio) "Due to maintenance, the pool will remain closed until further notice." La piscina…',
      options: ['abre hoy', 'cierra solo una hora', 'está cerrada sin fecha de reapertura', 'cambia de horario'],
      correctIndex: 2,
    },
    {
      code: 'DIAG-LIS-03',
      skill: 'listening',
      level: 'B1',
      stem: '(Conversación) "Could you speak up? I can barely hear you." La persona pide…',
      options: ['hablar más alto', 'hablar más despacio', 'repetir la fecha', 'colgar la llamada'],
      correctIndex: 0,
    },
    {
      code: 'DIAG-LIS-04',
      skill: 'listening',
      level: 'B2',
      stem: '(Charla) "Had the results been verified earlier, the error would not have spread." ¿Qué pasó en realidad?',
      options: [
        'Los resultados se verificaron temprano',
        'El error no se difundió',
        'Los resultados no se verificaron a tiempo y el error se difundió',
        'No hubo ningún error',
      ],
      correctIndex: 2,
    },
    {
      code: 'DIAG-LU-01',
      skill: 'language_use',
      level: 'A2',
      stem: 'She ____ to school by bus every day.',
      options: ['go', 'goes', 'going', 'went'],
      correctIndex: 1,
    },
    {
      code: 'DIAG-LU-02',
      skill: 'language_use',
      level: 'B1',
      stem: 'By the time we arrived, the lecture ____.',
      options: ['already started', 'has already started', 'had already started', 'starts'],
      correctIndex: 2,
    },
    {
      code: 'DIAG-LU-03',
      skill: 'language_use',
      level: 'B1',
      stem: 'If I ____ more time, I would join the debate club.',
      options: ['have', 'had', 'will have', 'would have'],
      correctIndex: 1,
    },
    {
      code: 'DIAG-LU-04',
      skill: 'language_use',
      level: 'B2',
      stem: 'The scholarship, ____ covers full tuition, is awarded annually.',
      options: ['that', 'who', 'which', 'whose'],
      correctIndex: 2,
    },
  ] as const;

  for (const [index, def] of diagnosticDefs.entries()) {
    await prisma.diagnosticItem.upsert({
      where: { code: def.code },
      update: {},
      create: {
        code: def.code,
        skill: def.skill,
        level: def.level,
        orderIndex: index + 1,
        prompt: { stem: def.stem, options: [...def.options] } as Prisma.InputJsonObject,
        answerKey: { correctIndex: def.correctIndex } as Prisma.InputJsonObject,
      },
    });
  }

  // ---------- Familia demo ----------
  const guardian = await prisma.user.upsert({
    where: { email: 'ana@demo.starbiz.pe' },
    update: {},
    create: { email: 'ana@demo.starbiz.pe', displayName: 'Ana Torres', role: 'guardian' },
  });
  const diego = await prisma.user.upsert({
    where: { email: 'diego@demo.starbiz.pe' },
    update: {},
    create: { email: 'diego@demo.starbiz.pe', displayName: 'Diego Torres', role: 'learner', ageBand: 't14_17' },
  });
  const lucia = await prisma.user.upsert({
    where: { email: 'lucia@demo.starbiz.pe' },
    update: {},
    create: { email: 'lucia@demo.starbiz.pe', displayName: 'Lucía Torres', role: 'learner', ageBand: 'y12_13' },
  });
  await prisma.user.upsert({
    where: { email: 'rivas@demo.starbiz.pe' },
    update: {},
    create: { email: 'rivas@demo.starbiz.pe', displayName: 'Prof. Rivas', role: 'staff' },
  });

  for (const learner of [diego, lucia]) {
    await prisma.guardianLearnerLink.upsert({
      where: { guardianId_learnerId: { guardianId: guardian.id, learnerId: learner.id } },
      update: { status: 'active' },
      create: { guardianId: guardian.id, learnerId: learner.id, status: 'active' },
    });
    for (const purpose of ['service', 'ai_voice', 'storage', 'international_transfer'] as const) {
      const existing = await prisma.consentGrant.findFirst({
        where: { learnerId: learner.id, purpose, status: 'granted' },
      });
      if (!existing) {
        await prisma.consentGrant.create({
          data: {
            learnerId: learner.id,
            grantedById: guardian.id,
            purpose,
            noticeVersion: NOTICE_VERSION,
          },
        });
      }
    }
    const assent = await prisma.youthAssent.findFirst({ where: { learnerId: learner.id } });
    if (!assent) {
      await prisma.youthAssent.create({
        data: { learnerId: learner.id, noticeVersion: NOTICE_VERSION },
      });
    }
  }

  console.log('Seed completado:');
  console.log(`- Programa: ${program.code} @ ${version.version} (published)`);
  console.log(`- Unidad ${unit.code} con ${lessonDefs.length} lecciones y ${activityDefs.length} actividades`);
  console.log(`- ${diagnosticDefs.length} ítems de diagnóstico`);
  console.log('- Familia demo: ana@ (apoderada), diego@ (14-17), lucia@ (12-13, voz bloqueada sin ZDR), rivas@ (staff)');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
