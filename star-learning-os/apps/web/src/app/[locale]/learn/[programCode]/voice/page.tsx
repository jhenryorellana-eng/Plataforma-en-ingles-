'use client';

import { use, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { EnrollmentResponse, TodayResponse, VoiceSessionResponse } from '@star/contracts';
import { ClientApiError, clientApi } from '@/lib/client-api';
import { Card, EmptyState, Group, Icon, IconTile, LoadingStack, Row, SectionHeader, type IconName } from '@/components/ui';
import { MicTest } from '@/components/mic-test';
import { NovaFace, type NovaState } from '@/components/nova';
import { Confetti } from '@/components/confetti';

type Phase = 'loading' | 'preview' | 'live' | 'ended' | 'blocked';

interface ChatTurn {
  from: 'mentor' | 'student';
  text: string;
  /** Turno del Mentor que aún se está transcribiendo en vivo. */
  live?: boolean;
}

const HEARTBEAT_SECONDS = 15;

export default function VoicePage({
  params,
}: {
  params: Promise<{ locale: string; programCode: string }>;
}) {
  const { locale, programCode } = use(params);
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>('loading');
  const [enrollment, setEnrollment] = useState<EnrollmentResponse | null>(null);
  const [lessonContractId, setLessonContractId] = useState<string | null>(null);
  const [missionTitle, setMissionTitle] = useState('');
  const [missionMinutes, setMissionMinutes] = useState<number | null>(null);
  const [voice, setVoice] = useState<VoiceSessionResponse | null>(null);
  const [blockedMessage, setBlockedMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [draft, setDraft] = useState('');
  const [scriptIndex, setScriptIndex] = useState(1);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportSent, setReportSent] = useState(false);
  const [techCheckDone, setTechCheckDone] = useState(false);
  const [micWorks, setMicWorks] = useState(true);
  const [endSummary, setEndSummary] = useState<{ usedMinutes?: number; includedMinutes?: number; novasAwarded?: number } | null>(null);
  const [userSpeaking, setUserSpeaking] = useState(false);
  const [mentorSpeaking, setMentorSpeaking] = useState(false);
  const [mentorThinking, setMentorThinking] = useState(false);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [mockSpeaking, setMockSpeaking] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [starting, setStarting] = useState(false);

  const peerRef = useRef<RTCPeerConnection | null>(null);
  const micRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const mentorBufferRef = useRef('');
  const playErrorRef = useRef<string | null>(null);
  /** Espejo del cronómetro para callbacks estables (el heartbeat depende de ello). */
  const elapsedRef = useRef(0);
  const introTimerRef = useRef<number | null>(null);
  const [audioDebug, setAudioDebug] = useState('');

  /** El <audio> solo existe en fase live y ontrack puede dispararse antes: adjuntar es idempotente. */
  const attachRemoteAudio = useCallback(() => {
    const audio = audioRef.current;
    const stream = remoteStreamRef.current;
    if (!audio || !stream) return;
    if (audio.srcObject !== stream) audio.srcObject = stream;
    audio
      .play()
      .then(() => {
        playErrorRef.current = null;
      })
      .catch((cause: unknown) => {
        playErrorRef.current = cause instanceof Error ? cause.name : 'unknown';
        // Autoplay bloqueado: cualquier toque del alumno cuenta como gesto y reactiva el audio.
        document.addEventListener('pointerdown', () => void audio.play(), { once: true });
      });
  }, []);

  // Sonda TEMPORAL de diagnóstico (solo dev): ¿llega el audio remoto y se reproduce?
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development' || phase !== 'live' || voice?.mode !== 'realtime') return;
    const probe = setInterval(() => void sampleAudioDebug(), 1000);
    return () => clearInterval(probe);
  }, [phase, voice]);

  async function sampleAudioDebug() {
    const audio = audioRef.current;
    const track = remoteStreamRef.current?.getAudioTracks()[0];
    let rtp = 'rtp:sin-stats';
    const stats = await peerRef.current?.getStats();
    stats?.forEach((entry) => {
      const report = entry as { type: string; kind?: string; bytesReceived?: number; audioLevel?: number };
      if (report.type === 'inbound-rtp' && report.kind === 'audio') {
        rtp = `rtp:${report.bytesReceived ?? 0}B lvl:${(report.audioLevel ?? 0).toFixed(3)}`;
      }
    });
    const trackInfo = track ? `${track.readyState}${track.muted ? '/MUTED' : ''}` : 'SIN-TRACK';
    const audioInfo = audio
      ? `${audio.srcObject ? 'src-ok' : 'SIN-SRC'} ${audio.paused ? 'PAUSED' : 'play'} t:${audio.currentTime.toFixed(1)} vol:${audio.volume}${audio.muted ? '/MUTED' : ''}`
      : 'SIN-ELEMENTO';
    const playError = playErrorRef.current ? ` · playErr:${playErrorRef.current}` : '';
    setAudioDebug(`${rtp} · track:${trackInfo} · audio:${audioInfo}${playError}`);
  }

  useEffect(() => {
    if (phase === 'live') attachRemoteAudio();
  }, [phase, attachRemoteAudio]);

  // Cargar inscripción y misión de voz disponible.
  const boot = useCallback(async () => {
    setError(null);
    try {
      const enrollments = await clientApi<EnrollmentResponse[]>('/enrollments');
      const found = enrollments.find((e) => e.program.code === programCode && e.status === 'active');
      if (!found) {
        router.push(`/${locale}/learn`);
        return;
      }
      setEnrollment(found);
      const today = await clientApi<TodayResponse>(`/enrollments/${found.id}/today`);
      const voiceBlock = today.blocks.find((block) => block.kind === 'voice_mission');
      if (voiceBlock?.lessonContractId) {
        setLessonContractId(voiceBlock.lessonContractId);
        setMissionTitle(voiceBlock.description);
        setMissionMinutes(voiceBlock.estimatedMinutes);
      }
      setPhase('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la misión');
      setPhase('preview');
    }
  }, [locale, programCode, router]);

  useEffect(() => {
    void boot();
  }, [boot]);

  // Cronómetro de tiempo activo.
  useEffect(() => {
    if (phase !== 'live' || paused) return;
    const timer = setInterval(() => {
      elapsedRef.current += 1;
      setElapsed(elapsedRef.current);
    }, 1000);
    return () => clearInterval(timer);
  }, [phase, paused]);

  /** Mic y TTS reales acordes al estado visible: pausar/silenciar de verdad. */
  const applyTrackState = useCallback((isMuted: boolean, isPaused: boolean) => {
    micRef.current?.getAudioTracks().forEach((track) => (track.enabled = !isMuted && !isPaused));
  }, []);

  const endSession = useCallback(
    async (reason: 'completed' | 'user_exit' | 'safety') => {
      peerRef.current?.close();
      peerRef.current = null;
      micRef.current?.getTracks().forEach((track) => track.stop());
      micRef.current = null;
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (introTimerRef.current !== null) {
        window.clearTimeout(introTimerRef.current);
        introTimerRef.current = null;
      }
      if (!voice) return;
      try {
        const summary = await clientApi<{ usedMinutes?: number; includedMinutes?: number; novasAwarded?: number }>(
          `/voice-sessions/${voice.voiceSessionId}/end`,
          { method: 'POST', body: JSON.stringify({ activeSeconds: elapsedRef.current, reason }) },
        );
        setEndSummary(summary);
      } catch {
        setEndSummary(null);
      }
      setPhase('ended');
    },
    [voice],
  );

  // Al salir de la página sin terminar la misión, nada queda sonando ni capturando.
  useEffect(() => {
    return () => {
      peerRef.current?.close();
      micRef.current?.getTracks().forEach((track) => track.stop());
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (introTimerRef.current !== null) window.clearTimeout(introTimerRef.current);
    };
  }, []);

  // Heartbeat: consumo real y límites del contrato (TLK-08).
  useEffect(() => {
    if (phase !== 'live' || !voice || paused) return;
    const beat = setInterval(async () => {
      try {
        const status = await clientApi<{ shouldEnd: boolean; reason: string | null }>(
          `/voice-sessions/${voice.voiceSessionId}/heartbeat`,
          { method: 'POST', body: JSON.stringify({ activeSecondsDelta: HEARTBEAT_SECONDS }) },
        );
        if (status.shouldEnd) void endSession('completed');
      } catch {
        // la pérdida de un heartbeat no termina la sesión (TLK-04)
      }
    }, HEARTBEAT_SECONDS * 1000);
    return () => clearInterval(beat);
  }, [phase, voice, paused, endSession]);

  async function startMission() {
    if (!enrollment || !lessonContractId || starting) return;
    setStarting(true);
    setError(null);
    try {
      const created = await clientApi<VoiceSessionResponse>(
        `/enrollments/${enrollment.id}/voice-sessions`,
        { method: 'POST', body: JSON.stringify({ lessonContractId }) },
      );
      setVoice(created);
      // En modo demo el guion arranca local; en realtime el saludo llega por el canal.
      if (created.mode === 'mock') {
        setTurns([{ from: 'mentor', text: created.mission.openingLine }]);
      }
      if (created.mode === 'realtime' && created.ephemeralClientSecret && created.realtimeCallUrl) {
        await connectRealtime(created);
      }
      setPhase('live');
      // Tarjeta de capítulo: la misión se presenta y Nova nace al revelarse.
      setShowIntro(true);
      introTimerRef.current = window.setTimeout(() => {
        setShowIntro(false);
        introTimerRef.current = null;
      }, 2900);
    } catch (err) {
      if (err instanceof ClientApiError && err.status === 403) {
        setBlockedMessage(err.message);
        setPhase('blocked');
        return;
      }
      setError(err instanceof Error ? err.message : 'No se pudo iniciar la sesión de voz');
    } finally {
      setStarting(false);
    }
  }

  /** Conexión WebRTC oficial: secreto efímero, jamás la clave estándar (Stack §2.6). */
  async function connectRealtime(created: VoiceSessionResponse) {
    const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
    micRef.current = mic;
    const peer = new RTCPeerConnection();
    peerRef.current = peer;
    for (const track of mic.getTracks()) peer.addTrack(track, mic);
    peer.ontrack = (event) => {
      const stream = event.streams[0] ?? new MediaStream([event.track]);
      remoteStreamRef.current = stream;
      setRemoteStream(stream);
      attachRemoteAudio();
    };
    peer.oniceconnectionstatechange = () => {
      if (peer.iceConnectionState === 'failed' || peer.iceConnectionState === 'disconnected') {
        setError('Se cortó la conexión con el Mentor. Sal de la misión y vuelve a intentarlo.');
      }
    };

    const channel = peer.createDataChannel('oai-events');
    dataChannelRef.current = channel;
    channel.addEventListener('message', handleRealtimeEvent);
    channel.addEventListener('open', () => {
      // VAD del servidor: el Mentor responde solo cuando el alumno habla,
      // y puede ser interrumpido (conversación natural, no walkie-talkie).
      channel.send(
        JSON.stringify({
          type: 'session.update',
          session: {
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 600,
              create_response: true,
              interrupt_response: true,
            },
          },
        }),
      );
      // El Mentor abre la misión con su primera línea.
      channel.send(
        JSON.stringify({
          type: 'response.create',
          response: {
            instructions: `Empieza la misión ahora: saluda brevemente y di algo equivalente a "${created.mission.openingLine}"`,
          },
        }),
      );
    });

    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    const response = await fetch(created.realtimeCallUrl as string, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${created.ephemeralClientSecret}`,
        'Content-Type': 'application/sdp',
      },
      body: offer.sdp,
    });
    if (!response.ok) throw new Error('No se pudo conectar con el Mentor por WebRTC');
    await peer.setRemoteDescription({ type: 'answer', sdp: await response.text() });
  }

  /** Eventos del canal realtime: subtítulos del Mentor, quién habla y errores. */
  function handleRealtimeEvent(event: MessageEvent) {
    let message: { type?: string; delta?: string; transcript?: string };
    try {
      message = JSON.parse(String(event.data)) as { type?: string; delta?: string; transcript?: string };
    } catch {
      return;
    }
    switch (message.type) {
      case 'response.output_audio_transcript.delta':
        mentorBufferRef.current += message.delta ?? '';
        updateMentorTurn(mentorBufferRef.current);
        break;
      case 'response.output_audio_transcript.done': {
        mentorBufferRef.current = '';
        const finalText = message.transcript ?? '';
        if (finalText) {
          setTurns((previous) => {
            const last = previous[previous.length - 1];
            if (last && last.from === 'mentor' && last.live) {
              return [...previous.slice(0, -1), { from: 'mentor', text: finalText }];
            }
            return [...previous, { from: 'mentor', text: finalText }];
          });
        }
        break;
      }
      case 'response.created':
        // La respuesta se genera antes de que llegue el audio: Nova piensa.
        setMentorThinking(true);
        break;
      case 'output_audio_buffer.started':
        setMentorThinking(false);
        setMentorSpeaking(true);
        break;
      case 'output_audio_buffer.stopped':
        setMentorSpeaking(false);
        break;
      case 'input_audio_buffer.speech_started':
        setUserSpeaking(true);
        break;
      case 'input_audio_buffer.speech_stopped':
        setUserSpeaking(false);
        break;
      case 'error':
        setError('El Mentor tuvo un problema. Sal de la misión y vuelve a intentarlo.');
        break;
    }
  }

  /** El turno del Mentor se actualiza en vivo mientras llega la transcripción. */
  function updateMentorTurn(text: string) {
    setTurns((previous) => {
      const last = previous[previous.length - 1];
      if (last && last.from === 'mentor' && last.live) {
        return [...previous.slice(0, -1), { ...last, text }];
      }
      return [...previous, { from: 'mentor', text, live: true }];
    });
  }

  function sendMockTurn() {
    if (!voice || draft.trim().length === 0) return;
    const studentTurn: ChatTurn = { from: 'student', text: draft.trim() };
    const script = voice.mission.mockLines ?? [];
    const mentorLine = script[scriptIndex];
    setTurns((previous) =>
      mentorLine
        ? [...previous, studentTurn, { from: 'mentor', text: mentorLine }]
        : [...previous, studentTurn],
    );
    setScriptIndex((value) => value + 1);
    setDraft('');
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && mentorLine) {
      const utterance = new SpeechSynthesisUtterance(mentorLine);
      utterance.lang = 'en-US';
      utterance.onstart = () => setMockSpeaking(true);
      utterance.onend = () => setMockSpeaking(false);
      utterance.onerror = () => setMockSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  }

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    applyTrackState(next, paused);
  }

  function togglePause() {
    const next = !paused;
    setPaused(next);
    // Pausa real: el mic deja de capturar, el audio remoto se silencia y el
    // Mentor demo se calla al instante.
    applyTrackState(muted, next);
    if (audioRef.current) audioRef.current.muted = next;
    if (next && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setMockSpeaking(false);
    }
  }

  async function sendReport(category: string) {
    try {
      await clientApi('/safety/report', {
        method: 'POST',
        body: JSON.stringify({ category, voiceSessionId: voice?.voiceSessionId }),
      });
      setReportSent(true);
      setReportOpen(false);
    } catch {
      // Jamás fingir que un reporte de protección llegó: el error se ve y se puede reintentar.
      setReportOpen(false);
      setError('No se pudo enviar el reporte. Inténtalo de nuevo; si sigue fallando, sal de la misión y avisa a un adulto.');
    }
  }

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  const novaState: NovaState = paused
    ? 'paused'
    : voice?.mode === 'realtime'
      ? mentorSpeaking
        ? 'speaking'
        : userSpeaking
          ? 'listening'
          : mentorThinking
            ? 'thinking'
            : 'idle'
      : mockSpeaking
        ? 'speaking'
        : 'idle';

  // Subtítulos estilo llamada: el turno vivo del Mentor y el anterior atenuado.
  const reversed = [...turns].reverse();
  const liveCaption = reversed.find((turn) => turn.from === 'mentor' && turn.live) ?? null;
  const lastFinalCaption = reversed.find((turn) => turn.from === 'mentor' && !turn.live) ?? null;
  const caption = liveCaption ?? lastFinalCaption;

  if (phase === 'loading') {
    return <LoadingStack label="Buscando tu misión de voz" />;
  }

  if (phase === 'blocked') {
    return (
      <div className="rise mt-4 flex flex-col gap-3">
        <SectionHeader>Protección activa</SectionHeader>
        <Group>
          <Row
            icon="shield"
            iconColor="bg-gold"
            title="Sesión de voz no disponible"
            subtitle={blockedMessage}
          />
        </Group>
        <p className="px-5 text-[12px] leading-relaxed text-dim">
          Esta protección es un bloqueo técnico del sistema, no un mensaje decorativo: así lo exige
          la política juvenil de StarbizAcademy.
        </p>
      </div>
    );
  }

  if (phase === 'ended') {
    return (
      <Card className="rise relative mt-10 flex flex-col items-center gap-3 overflow-hidden px-6 py-10 text-center">
        {endSummary?.novasAwarded ? <Confetti /> : null}
        <NovaFace state="celebrate" className="size-28" />
        <h1 className="mt-2 text-[26px] font-extrabold tracking-tight text-ink">Misión terminada</h1>
        <p className="text-[15px] text-dim">
          Practicaste {minutes} min {seconds} s de conversación activa.
        </p>
        {endSummary?.novasAwarded ? (
          <p className="rounded-full bg-gold-soft px-4 py-1.5 text-[15px] font-extrabold text-gold-deep">
            +{endSummary.novasAwarded} Novas
          </p>
        ) : null}
        {endSummary?.includedMinutes !== undefined && (
          <p className="text-[13px] tabular-nums text-dim">
            Voz de la semana: {endSummary.usedMinutes} / {endSummary.includedMinutes} min
          </p>
        )}
        <button
          type="button"
          onClick={() => router.push(`/${locale}/learn/${programCode}/today`)}
          className="mt-3 w-full max-w-xs rounded-2xl bg-primary py-3.5 text-[17px] font-semibold text-white transition-opacity hover:opacity-90"
        >
          Volver a Inicio
        </button>
      </Card>
    );
  }

  if (phase === 'preview') {
    if (!lessonContractId) {
      // Un fallo de carga NO se disfraza de "no tienes misión": el error manda.
      if (error) {
        return (
          <Card className="rise mt-6">
            <EmptyState
              icon="review"
              iconColor="bg-risk"
              title="No pudimos cargar tu misión"
              body={error}
              action={
                <button
                  type="button"
                  onClick={() => void boot()}
                  className="btn-gradient inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-[15px] font-semibold text-white"
                >
                  Reintentar
                  <Icon name="arrow" className="size-4 text-white" />
                </button>
              }
            />
          </Card>
        );
      }
      return (
        <Card className="rise mt-6">
          <EmptyState
            icon="mic"
            iconColor="bg-teal"
            title="Sin misiones de voz por ahora"
            body="Tu próxima conversación con el Mentor aparecerá aquí cuando tu plan del día la incluya. Mientras tanto, sigue avanzando en tu ruta."
            action={
              <Link
                href={`/${locale}/learn/${programCode}/today`}
                className="btn-gradient inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-[15px] font-semibold text-white"
              >
                Ir a Inicio
                <Icon name="arrow" className="size-4 text-white" />
              </Link>
            }
          />
        </Card>
      );
    }
    return (
      <div className="flex flex-col gap-7">
        <header className="rise flex flex-col items-center pt-4 text-center">
          <NovaFace state="idle" className="size-28" />
          <h1 className="mt-5 text-[28px] font-extrabold tracking-tight text-ink">Nova</h1>
          <p className="mt-1 text-[14px] text-dim">Tu mentora de voz STAR</p>
        </header>

        <Card className="rise rise-1 px-5 py-4">
          <div className="flex items-start gap-3.5">
            <IconTile name="mic" color="bg-teal" className="size-10 rounded-xl [&>svg]:size-5" />
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-bold uppercase tracking-wide text-dim">
                Tu misión de hoy
              </p>
              <p className="mt-0.5 text-[16px] font-semibold leading-snug text-ink">
                {missionTitle}
              </p>
              {missionMinutes !== null && (
                <p className="mt-1 text-[13px] text-dim">~{missionMinutes} min de conversación</p>
              )}
            </div>
          </div>
        </Card>

        <div className="rise rise-2">
          <SectionHeader>Antes de empezar</SectionHeader>
          <Group>
            <Row
              icon="shield"
              iconColor="bg-ok"
              title="Es una IA educativa"
              subtitle="Siempre se presenta como tal; puedes pausar, reportar o salir cuando quieras"
            />
            <Row
              icon="mic"
              iconColor="bg-teal"
              title="Tu audio no se guarda"
              subtitle="Solo queda la evidencia pedagógica mínima de tu práctica"
            />
          </Group>

          <div className="mt-4">
            <MicTest
              onDone={(micOk) => {
                setTechCheckDone(true);
                setMicWorks(micOk);
              }}
            />
          </div>

          <button
            type="button"
            disabled={!techCheckDone || starting}
            onClick={startMission}
            className="btn-gradient mt-5 w-full rounded-2xl py-3.5 text-[17px] font-semibold text-white disabled:opacity-40"
          >
            {starting
              ? 'Conectando…'
              : techCheckDone
                ? micWorks
                  ? 'Comenzar misión'
                  : 'Comenzar en modo texto'
                : 'Completa la prueba técnica'}
          </button>
          {error && <p className="mt-2 text-center text-[14px] text-risk">{error}</p>}
        </div>
      </div>
    );
  }

  // Sesión en vivo: Nova es la protagonista del escenario.
  return (
    <div className="rise call-stage fixed inset-0 z-[60] flex min-h-dvh flex-col overflow-hidden pb-[max(env(safe-area-inset-bottom),16px)] pt-[max(env(safe-area-inset-top),16px)] text-white">
      <audio ref={audioRef} autoPlay className="hidden" data-audio-debug={audioDebug || undefined} />

      {showIntro && (
        <div className="nova-intro pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-b-[28px] bg-[#0f0f1f] px-8 pb-24 text-center">
          <p className="text-[12px] font-bold uppercase tracking-[0.22em] text-white/45">
            Tu misión de hoy
          </p>
          <p className="max-w-xs text-[24px] font-extrabold leading-tight">{missionTitle}</p>
          <p className="text-[13px] text-white/50">Nova te acompaña</p>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 sm:px-5">
      <header className="flex flex-col items-center text-center">
        <NovaFace
          state={novaState}
          stream={remoteStream}
          reactive
          born={!showIntro}
          className="size-44"
        />
        <h1 className="mt-2 text-[20px] font-bold tracking-tight">Nova</h1>
        <p className="text-[13px] text-white/60">
          {voice?.mode === 'mock'
            ? 'Modo demo · interlocutor guiado'
            : userSpeaking
              ? 'Te escucha…'
              : mentorThinking
                ? 'Pensando…'
                : mentorSpeaking
                  ? 'Hablando…'
                  : 'En vivo · WebRTC'}
        </p>
        <p className="mt-0.5 text-[20px] font-semibold tabular-nums tracking-tight text-white/75">
          {minutes}:{String(seconds).padStart(2, '0')}
        </p>
      </header>

      {error && (
        <p role="alert" className="mt-3 rounded-2xl bg-risk/25 px-4 py-2.5 text-center text-[14px] font-medium text-[#ffb3ab]">
          {error}
        </p>
      )}

      {voice?.mode === 'realtime' ? (
        <div className="mt-2 flex flex-1 flex-col items-center justify-center gap-2.5 px-2 text-center">
          {liveCaption && lastFinalCaption && (
            <p className="max-w-sm text-[14px] leading-relaxed text-white/40">
              {lastFinalCaption.text}
            </p>
          )}
          {caption && (
            <p
              className={`max-w-sm text-[19px] font-medium leading-snug ${
                caption.live ? 'text-white/70' : 'text-white'
              }`}
            >
              {caption.text}
            </p>
          )}
        </div>
      ) : (
        turns.length > 0 && (
          <div className="mt-5 flex max-h-72 flex-1 flex-col gap-2 overflow-y-auto">
            {turns.map((turn, turnIndex) => (
              <p
                key={turnIndex}
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed ${
                  turn.from === 'mentor'
                    ? 'self-start bg-white/12 text-white'
                    : 'self-end bg-primary text-white'
                } ${turn.live ? 'opacity-80' : ''}`}
              >
                {turn.text}
              </p>
            ))}
          </div>
        )
      )}

      {voice?.mode === 'mock' && !paused && (
        <div className="mt-3 flex gap-2">
          <input
            aria-label="Tu respuesta en inglés"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && sendMockTurn()}
            placeholder="Responde en inglés…"
            className="flex-1 rounded-full bg-white/12 px-4 py-2.5 text-[15px] text-white placeholder:text-white/40 focus:bg-white/16 focus:outline-none"
          />
          <button
            type="button"
            onClick={sendMockTurn}
            aria-label="Enviar"
            className="flex size-10 items-center justify-center rounded-full bg-primary transition-opacity hover:opacity-90"
          >
            <Icon name="arrow" className="size-4.5 text-white" />
          </button>
        </div>
      )}

      {reportSent && (
        <p className="absolute inset-x-4 bottom-28 z-40 rounded-2xl bg-[#17382b] px-4 py-2.5 text-center text-[13px] text-[#8af0ae] shadow-xl">
          Gracias por avisar. Una persona del equipo lo revisará.
        </p>
      )}

      {reportOpen && (
        <div className="absolute inset-x-4 bottom-28 z-40 rounded-2xl border border-white/10 bg-[#172337] p-3 shadow-2xl">
          <p className="px-1 pb-2 text-[14px] font-semibold">¿Qué quieres reportar?</p>
          <div className="flex flex-col gap-1.5">
            {[
              { category: 'inappropriate_content', label: 'Algo que me incomodó' },
              { category: 'technical', label: 'Un problema técnico' },
              { category: 'other', label: 'Otra cosa' },
            ].map((option) => (
              <button
                key={option.category}
                type="button"
                onClick={() => sendReport(option.category)}
                className="rounded-xl bg-white/10 px-3.5 py-2.5 text-left text-[14px] transition-colors hover:bg-white/16"
              >
                {option.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setReportOpen(false)}
              className="py-1.5 text-center text-[13px] text-white/60"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      </div>

      {/* Controles de llamada SIEMPRE visibles (TLK-09). */}
      <div className="relative z-30 mt-auto grid grid-cols-4 gap-2 border-t border-white/10 bg-[#07111f]/95 px-2 pt-4 backdrop-blur sm:px-5">
        <CallButton
          icon={muted ? 'mic' : 'mute'}
          label={muted ? 'Activar' : 'Silenciar'}
          active={muted}
          onClick={toggleMute}
        />
        <CallButton
          icon={paused ? 'play' : 'pause'}
          label={paused ? 'Reanudar' : 'Pausar'}
          active={paused}
          onClick={togglePause}
        />
        <CallButton icon="flag" label="Reportar" onClick={() => setReportOpen(true)} />
        <CallButton icon="exit" label="Salir" tone="risk" onClick={() => endSession('user_exit')} />
      </div>
    </div>
  );
}

function CallButton({
  icon,
  label,
  onClick,
  active = false,
  tone = 'default',
}: {
  icon: IconName;
  label: string;
  onClick: () => void;
  active?: boolean;
  tone?: 'default' | 'risk';
}) {
  return (
    <button type="button" onClick={onClick} className="flex w-14 flex-col items-center justify-self-center gap-1.5 sm:w-16">
      <span
        className={`flex size-12 items-center justify-center rounded-full transition-colors sm:size-14 ${
          tone === 'risk'
            ? 'bg-risk hover:opacity-90'
            : active
              ? 'bg-white text-ink'
              : 'bg-white/15 hover:bg-white/25'
        }`}
      >
        <Icon name={icon} className={`size-6 ${tone === 'risk' || !active ? 'text-white' : 'text-ink'}`} />
      </span>
      <span className="text-[11px] text-white/70">{label}</span>
    </button>
  );
}
