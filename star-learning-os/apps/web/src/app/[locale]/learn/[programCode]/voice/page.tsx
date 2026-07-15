'use client';

import { use, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { EnrollmentResponse, TodayResponse, VoiceSessionResponse } from '@star/contracts';
import { ClientApiError, clientApi } from '@/lib/client-api';
import { Card, Chip } from '@/components/ui';

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
    return <p className="mt-16 text-center text-sm text-dim">Buscando tu misión de voz…</p>;
  }

  if (phase === 'blocked') {
    return (
      <Card className="rise mt-8 flex flex-col gap-3 border-warn/40 px-5 py-6">
        <span className="text-2xl" aria-hidden>
          🛡️
        </span>
        <h1 className="font-display text-lg font-semibold">Sesión de voz no disponible</h1>
        <p className="text-sm leading-relaxed text-dim">{blockedMessage}</p>
        <p className="text-xs text-dim">
          Esta protección es un bloqueo técnico del sistema, no un mensaje decorativo: así lo exige
          la política juvenil de StarbizAcademy.
        </p>
      </Card>
    );
  }

  if (phase === 'ended') {
    return (
      <Card glow className="rise mt-8 flex flex-col gap-4 px-5 py-6 text-center">
        <span className="text-3xl" aria-hidden>
          ✦
        </span>
        <h1 className="font-display text-xl font-semibold">Misión terminada</h1>
        <p className="text-sm text-dim">
          Practicaste {minutes} min {seconds} s de conversación activa.
        </p>
        {endSummary?.includedMinutes !== undefined && (
          <p className="text-xs text-dim">
            Voz de la semana: {endSummary.usedMinutes} / {endSummary.includedMinutes} min
          </p>
        )}
        <button
          type="button"
          onClick={() => router.push(`/${locale}/learn/${programCode}/today`)}
          className="rounded-xl bg-star px-5 py-3 font-display font-semibold text-night"
        >
          Volver a Hoy
        </button>
      </Card>
    );
  }

  if (phase === 'preview') {
    return (
      <div className="flex flex-col gap-5">
        <section className="rise text-center">
          <div className="mentor-orb mentor-orb-quiet mx-auto size-28 rounded-full" aria-hidden />
          <h1 className="mt-5 font-display text-2xl font-semibold">Misión de voz</h1>
          <p className="mt-1 text-sm text-dim">
            {missionTitle || 'Sin misiones de voz pendientes por ahora.'}
          </p>
        </section>
        {lessonContractId && (
          <Card className="rise rise-1 flex flex-col gap-3 px-5 py-5 text-sm text-dim">
            <p>
              Hablarás con tu <strong className="text-ink">Mentor STAR</strong> — una IA educativa,
              y siempre se presenta como tal. Puedes pausar, silenciar tu micrófono, reportar o
              salir en cualquier momento.
            </p>
            <p className="text-xs">
              Tu audio de práctica no se guarda. Solo queda la evidencia pedagógica mínima.
            </p>
            <button
              type="button"
              onClick={startMission}
              className="mt-2 rounded-2xl bg-gradient-to-r from-star-deep via-star to-star-deep px-6 py-4 font-display text-lg font-semibold text-night shadow-[0_0_40px_rgba(255,201,77,0.25)]"
            >
              Comenzar misión ◉
            </button>
            {error && <p className="text-sm text-risk">{error}</p>}
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <audio ref={audioRef} className="hidden" />
      <section className="rise flex flex-col items-center gap-3 text-center">
        <div
          className={`mentor-orb size-24 rounded-full ${paused ? 'mentor-orb-quiet opacity-60' : ''}`}
          aria-hidden
        />
        <div>
          <p className="font-display text-lg font-semibold">Mentor STAR</p>
          <p className="text-xs text-dim">
            {voice?.mode === 'mock'
              ? 'Modo demo (sin OPENAI_API_KEY): interlocutor guiado'
              : 'Conversación en vivo · WebRTC'}
            {' · '}
            {minutes}:{String(seconds).padStart(2, '0')}
          </p>
        </div>
        <Chip tone="nova">{voice?.mission.objective}</Chip>
      </section>

      {voice?.mode === 'mock' && (
        <Card className="rise rise-1 flex max-h-80 flex-col gap-3 overflow-y-auto px-4 py-4">
          {turns.map((turn, turnIndex) => (
            <p
              key={turnIndex}
              className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                turn.from === 'mentor'
                  ? 'self-start bg-raised text-ink'
                  : 'self-end bg-star/15 text-star'
              }`}
            >
              {turn.text}
            </p>
          ))}
        </Card>
      )}

      {voice?.mode === 'mock' && !paused && (
        <div className="rise rise-2 flex gap-2">
          <input
            aria-label="Tu respuesta en inglés"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && sendMockTurn()}
            placeholder="Responde en inglés…"
            className="flex-1 rounded-xl border border-line bg-night/60 px-4 py-3 text-sm focus:border-star focus:outline-none"
          />
          <button
            type="button"
            onClick={sendMockTurn}
            className="rounded-xl bg-star px-4 font-display font-semibold text-night"
          >
            →
          </button>
        </div>
      )}

      {/* Controles SIEMPRE visibles (TLK-09): Pausar, Silenciar, Reportar, Salir. */}
      <div className="rise rise-3 grid grid-cols-4 gap-2">
        <button
          type="button"
          onClick={() => setPaused((value) => !value)}
          className={`rounded-xl border px-2 py-3 text-xs transition-colors ${
            paused ? 'border-star text-star' : 'border-line text-dim hover:text-ink'
          }`}
        >
          {paused ? '▶ Reanudar' : '⏸ Pausar'}
        </button>
        <button
          type="button"
          onClick={toggleMute}
          className={`rounded-xl border px-2 py-3 text-xs transition-colors ${
            muted ? 'border-warn text-warn' : 'border-line text-dim hover:text-ink'
          }`}
        >
          {muted ? '🎙 Activar' : '🔇 Silenciar'}
        </button>
        <button
          type="button"
          onClick={() => setReportOpen(true)}
          className="rounded-xl border border-line px-2 py-3 text-xs text-dim transition-colors hover:border-warn hover:text-warn"
        >
          ⚑ Reportar
        </button>
        <button
          type="button"
          onClick={() => endSession('user_exit')}
          className="rounded-xl border border-line px-2 py-3 text-xs text-dim transition-colors hover:border-risk hover:text-risk"
        >
          ✕ Salir
        </button>
      </div>

      {reportSent && (
        <Card className="border-ok/40 px-4 py-3 text-sm text-ok">
          Gracias por avisar. Una persona del equipo lo revisará y recibirás seguimiento.
        </Card>
      )}

      {reportOpen && (
        <Card className="rise flex flex-col gap-2 border-warn/40 px-4 py-4">
          <p className="text-sm font-medium">¿Qué quieres reportar?</p>
          {[
            { category: 'inappropriate_content', label: 'Algo que me incomodó' },
            { category: 'technical', label: 'Un problema técnico' },
            { category: 'other', label: 'Otra cosa' },
          ].map((option) => (
            <button
              key={option.category}
              type="button"
              onClick={() => sendReport(option.category)}
              className="rounded-lg border border-line px-3 py-2 text-left text-sm text-dim hover:border-warn hover:text-ink"
            >
              {option.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setReportOpen(false)}
            className="mt-1 text-xs text-dim underline"
          >
            Cancelar
          </button>
        </Card>
      )}
    </div>
  );
}
