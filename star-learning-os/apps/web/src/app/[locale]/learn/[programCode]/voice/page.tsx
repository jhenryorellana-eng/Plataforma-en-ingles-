'use client';

import { use, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { EnrollmentResponse, TodayResponse, VoiceSessionResponse } from '@star/contracts';
import { ClientApiError, clientApi } from '@/lib/client-api';
import { Card, EmptyState, Group, Icon, IconTile, LoadingStack, Row, SectionHeader, StarMark, type IconName } from '@/components/ui';
import { MicTest } from '@/components/mic-test';

type Phase = 'loading' | 'preview' | 'live' | 'ended' | 'blocked';

interface ChatTurn {
  from: 'mentor' | 'student';
  text: string;
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
  const [endSummary, setEndSummary] = useState<{ usedMinutes?: number; includedMinutes?: number } | null>(null);

  const peerRef = useRef<RTCPeerConnection | null>(null);
  const micRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Cargar inscripción y misión de voz disponible.
  useEffect(() => {
    async function boot() {
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
    }
    void boot();
  }, [locale, programCode, router]);

  // Cronómetro de tiempo activo.
  useEffect(() => {
    if (phase !== 'live' || paused) return;
    const timer = setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [phase, paused]);

  const endSession = useCallback(
    async (reason: 'completed' | 'user_exit' | 'safety') => {
      peerRef.current?.close();
      micRef.current?.getTracks().forEach((track) => track.stop());
      if (!voice) return;
      try {
        const summary = await clientApi<{ usedMinutes?: number; includedMinutes?: number }>(
          `/voice-sessions/${voice.voiceSessionId}/end`,
          { method: 'POST', body: JSON.stringify({ activeSeconds: elapsed, reason }) },
        );
        setEndSummary(summary);
      } catch {
        setEndSummary(null);
      }
      setPhase('ended');
    },
    [voice, elapsed],
  );

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
    if (!enrollment || !lessonContractId) return;
    setError(null);
    try {
      const created = await clientApi<VoiceSessionResponse>(
        `/enrollments/${enrollment.id}/voice-sessions`,
        { method: 'POST', body: JSON.stringify({ lessonContractId }) },
      );
      setVoice(created);
      setTurns([{ from: 'mentor', text: created.mission.openingLine }]);
      if (created.mode === 'realtime' && created.ephemeralClientSecret && created.realtimeCallUrl) {
        await connectRealtime(created);
      }
      setPhase('live');
    } catch (err) {
      if (err instanceof ClientApiError && err.status === 403) {
        setBlockedMessage(err.message);
        setPhase('blocked');
        return;
      }
      setError(err instanceof Error ? err.message : 'No se pudo iniciar la sesión de voz');
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
      if (audioRef.current) {
        audioRef.current.srcObject = event.streams[0];
        void audioRef.current.play();
      }
    };
    peer.createDataChannel('oai-events');
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
      window.speechSynthesis.speak(utterance);
    }
  }

  function toggleMute() {
    setMuted((value) => {
      const next = !value;
      micRef.current?.getAudioTracks().forEach((track) => (track.enabled = !next));
      return next;
    });
  }

  async function sendReport(category: string) {
    try {
      await clientApi('/safety/report', {
        method: 'POST',
        body: JSON.stringify({ category, voiceSessionId: voice?.voiceSessionId }),
      });
      setReportSent(true);
    } catch {
      setReportSent(true);
    }
    setReportOpen(false);
  }

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

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
      <Card className="rise mt-10 flex flex-col items-center gap-3 px-6 py-10 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-ok-soft">
          <Icon name="check" className="size-7 text-ok" />
        </span>
        <h1 className="text-[26px] font-extrabold tracking-tight text-ink">Misión terminada</h1>
        <p className="text-[15px] text-dim">
          Practicaste {minutes} min {seconds} s de conversación activa.
        </p>
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
          <span className="relative inline-flex items-center justify-center">
            <span className="halo-ring absolute -inset-4 rounded-full" aria-hidden />
            <span className="mentor-avatar mentor-avatar-paused flex size-24 items-center justify-center rounded-full">
              <StarMark className="size-10 text-white" />
            </span>
          </span>
          <h1 className="mt-6 text-[28px] font-extrabold tracking-tight text-ink">Mentor STAR</h1>
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
            disabled={!techCheckDone}
            onClick={startMission}
            className="btn-gradient mt-5 w-full rounded-2xl py-3.5 text-[17px] font-semibold text-white disabled:opacity-40"
          >
            {techCheckDone
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

  // Sesión en vivo: escenario de llamada estilo FaceTime.
  return (
    <div className="rise call-stage -mx-4 -mt-6 flex min-h-[calc(100dvh-140px)] flex-col rounded-b-[28px] px-5 pb-7 pt-8 text-white">
      <audio ref={audioRef} className="hidden" />

      <header className="flex flex-col items-center text-center">
        <span className="relative inline-flex items-center justify-center">
          <span className="mentor-halo absolute -inset-5 rounded-full" aria-hidden />
          <span
            className={`mentor-avatar flex size-20 items-center justify-center rounded-full ${paused ? 'mentor-avatar-paused' : ''}`}
          >
            <StarMark className="size-8 text-white" />
          </span>
        </span>
        <h1 className="mt-4 text-[22px] font-bold tracking-tight">Mentor STAR</h1>
        <p className="text-[13px] text-white/60">
          {voice?.mode === 'mock' ? 'Modo demo · interlocutor guiado' : 'En vivo · WebRTC'}
        </p>
        <div className="mt-1.5 flex items-center gap-3">
          <span className={`eq ${paused ? 'eq-paused' : ''}`} aria-hidden>
            <span /><span /><span /><span /><span />
          </span>
          <p className="text-[28px] font-semibold tabular-nums tracking-tight text-white/90">
            {minutes}:{String(seconds).padStart(2, '0')}
          </p>
          <span className={`eq ${paused ? 'eq-paused' : ''}`} aria-hidden>
            <span /><span /><span /><span /><span />
          </span>
        </div>
      </header>

      {voice?.mode === 'mock' && (
        <div className="mt-5 flex max-h-72 flex-1 flex-col gap-2 overflow-y-auto">
          {turns.map((turn, turnIndex) => (
            <p
              key={turnIndex}
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed ${
                turn.from === 'mentor'
                  ? 'self-start bg-white/12 text-white'
                  : 'self-end bg-primary text-white'
              }`}
            >
              {turn.text}
            </p>
          ))}
        </div>
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
        <p className="mt-3 rounded-2xl bg-ok/20 px-4 py-2.5 text-center text-[13px] text-[#8af0ae]">
          Gracias por avisar. Una persona del equipo lo revisará.
        </p>
      )}

      {reportOpen && (
        <div className="mt-3 rounded-2xl bg-white/10 p-3 backdrop-blur">
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

      {/* Controles de llamada SIEMPRE visibles (TLK-09). */}
      <div className="mt-auto flex items-start justify-center gap-6 pt-6">
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
          onClick={() => setPaused((value) => !value)}
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
    <button type="button" onClick={onClick} className="flex w-16 flex-col items-center gap-1.5">
      <span
        className={`flex size-14 items-center justify-center rounded-full transition-colors ${
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
