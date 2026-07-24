'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ClientApiError, clientApi } from '@/lib/client-api';
import { NovaFace, type NovaState } from '@/components/nova';
import { Icon } from '@/components/ui';

type DemoPhase = 'closed' | 'intro' | 'connecting' | 'live' | 'complete' | 'error';
type LiveState = 'listening' | 'thinking' | 'speaking';

interface VoiceDemoCallResponse {
  mode: 'realtime';
  answerSdp: string;
  durationSeconds: number;
  promptVersion: string;
}

interface RealtimeEvent {
  type?: string;
  delta?: string;
  transcript?: string;
  response?: {
    status?: string;
    status_details?: {
      type?: string;
      reason?: string;
    };
  };
  error?: {
    type?: string;
    code?: string;
  };
}

const DEMO_DURATION_SECONDS = 60;
const PRIVACY_POINTS = [
  { icon: 'mic', text: 'El micrófono se activa únicamente durante la demo.' },
  {
    icon: 'shield',
    text: 'Tu audio se procesa en tiempo real por OpenAI. Starbiz no guarda esta conversación en su base de datos.',
  },
  {
    icon: 'lock',
    text: 'No digas nombres, edades ni información personal tuya o de un menor.',
  },
] as const;

export function VoiceDemo({ locale }: { locale: string }) {
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<DemoPhase>('closed');
  const [adultConfirmed, setAdultConfirmed] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(DEMO_DURATION_SECONDS);
  const [liveState, setLiveState] = useState<LiveState>('thinking');
  const [transcript, setTranscript] = useState('');
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState('');

  const peerRef = useRef<RTCPeerConnection | null>(null);
  const microphoneRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const deadlineRef = useRef(0);
  const transcriptBufferRef = useRef('');
  const attemptRef = useRef(0);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  const cleanupRealtime = useCallback(() => {
    attemptRef.current += 1;
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    channelRef.current?.close();
    channelRef.current = null;
    peerRef.current?.close();
    peerRef.current = null;
    for (const track of microphoneRef.current?.getTracks() ?? []) track.stop();
    microphoneRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.srcObject = null;
    }
    transcriptBufferRef.current = '';
    setRemoteStream(null);
  }, []);

  const finishDemo = useCallback(() => {
    cleanupRealtime();
    setSecondsLeft(0);
    setPhase('complete');
  }, [cleanupRealtime]);

  const failDemo = useCallback(
    (message: string) => {
      cleanupRealtime();
      setError(message);
      setPhase('error');
    },
    [cleanupRealtime],
  );

  useEffect(() => {
    setMounted(true);
    return cleanupRealtime;
  }, [cleanupRealtime]);

  useEffect(() => {
    if (phase === 'closed') return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      cleanupRealtime();
      setPhase('closed');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [cleanupRealtime, phase]);

  useEffect(() => {
    const audio = audioRef.current;
    if (phase !== 'live' || !audio || !remoteStream) return;
    audio.srcObject = remoteStream;
    void audio.play().catch(() => {
      failDemo('El navegador bloqueó el audio. Toca de nuevo la demo para escuchar a Nova.');
    });
  }, [failDemo, phase, remoteStream]);

  const closeDemo = useCallback(() => {
    cleanupRealtime();
    setPhase('closed');
  }, [cleanupRealtime]);

  const startCountdown = useCallback(
    (durationSeconds: number) => {
      const duration = Math.min(DEMO_DURATION_SECONDS, Math.max(1, durationSeconds));
      deadlineRef.current = Date.now() + duration * 1000;
      setSecondsLeft(duration);
      timerRef.current = window.setInterval(() => {
        const remaining = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000));
        setSecondsLeft(remaining);
        if (remaining === 0) finishDemo();
      }, 250);
    },
    [finishDemo],
  );

  const handleRealtimeEvent = useCallback(
    (event: MessageEvent) => {
      let message: RealtimeEvent;
      try {
        message = JSON.parse(String(event.data)) as RealtimeEvent;
      } catch {
        return;
      }

      switch (message.type) {
        case 'response.output_audio_transcript.delta':
          transcriptBufferRef.current += message.delta ?? '';
          setTranscript(transcriptBufferRef.current);
          break;
        case 'response.output_audio_transcript.done':
          if (message.transcript) setTranscript(message.transcript);
          transcriptBufferRef.current = '';
          break;
        case 'response.created':
          setLiveState('thinking');
          break;
        case 'response.done':
          if (message.response?.status && message.response.status !== 'completed') {
            // eslint-disable-next-line no-console -- Diagnóstico técnico sin audio ni transcripción.
            console.warn('[voice-demo] Realtime response ended early', {
              status: message.response.status,
              type: message.response.status_details?.type,
              reason: message.response.status_details?.reason,
            });
          }
          break;
        case 'output_audio_buffer.started':
          setLiveState('speaking');
          break;
        case 'output_audio_buffer.stopped':
          setLiveState('listening');
          break;
        case 'input_audio_buffer.speech_started':
          setLiveState('listening');
          break;
        case 'input_audio_buffer.speech_stopped':
          setLiveState('thinking');
          break;
        case 'error':
          // eslint-disable-next-line no-console -- Diagnóstico técnico sin audio ni transcripción.
          console.error('[voice-demo] Realtime error', {
            type: message.error?.type,
            code: message.error?.code,
          });
          failDemo('Nova tuvo un problema al responder. Puedes volver a intentarlo.');
          break;
      }
    },
    [failDemo],
  );

  async function startDemo() {
    if (!adultConfirmed) return;
    const attempt = attemptRef.current + 1;
    attemptRef.current = attempt;
    setPhase('connecting');
    setError('');
    setTranscript('');
    setSecondsLeft(DEMO_DURATION_SECONDS);
    setLiveState('thinking');

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Este navegador no permite usar el micrófono para la demo.');
      }
      const microphone = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      if (attemptRef.current !== attempt) {
        for (const track of microphone.getTracks()) track.stop();
        return;
      }
      microphoneRef.current = microphone;

      const peer = new RTCPeerConnection();
      peerRef.current = peer;
      for (const track of microphone.getTracks()) peer.addTrack(track, microphone);
      peer.ontrack = (event) => {
        const stream = event.streams[0] ?? new MediaStream([event.track]);
        setRemoteStream(stream);
      };
      peer.oniceconnectionstatechange = () => {
        if (peer.iceConnectionState === 'failed') {
          failDemo('Se perdió la conexión de voz. Revisa tu internet e inténtalo otra vez.');
        }
      };

      const channel = peer.createDataChannel('oai-events');
      channelRef.current = channel;
      channel.addEventListener('message', handleRealtimeEvent);
      channel.addEventListener('open', () => {
        if (attemptRef.current !== attempt) return;
        setPhase('live');
        setLiveState('thinking');
        channel.send(
          JSON.stringify({
            type: 'response.create',
            response: {
              instructions:
                'Saluda brevemente en español latinoamericano neutro, preséntate como Nova e invita a repetir "I can learn English". Después escucha.',
            },
          }),
        );
      });

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      const call = await clientApi<VoiceDemoCallResponse>('/voice-demo/call', {
        method: 'POST',
        body: JSON.stringify({ sdp: offer.sdp }),
      });
      if (attemptRef.current !== attempt) return;
      startCountdown(call.durationSeconds);
      await peer.setRemoteDescription({ type: 'answer', sdp: call.answerSdp });
    } catch (caught) {
      if (attemptRef.current !== attempt) return;
      if (caught instanceof DOMException && caught.name === 'NotAllowedError') {
        failDemo('Necesitamos permiso para usar tu micrófono durante este minuto.');
        return;
      }
      if (caught instanceof ClientApiError && caught.status === 429) {
        failDemo('Ya se usaron las 3 demos disponibles hoy desde esta conexión.');
        return;
      }
      failDemo(
        caught instanceof Error
          ? caught.message
          : 'No pudimos iniciar la demostración. Inténtalo nuevamente.',
      );
    }
  }

  const novaState: NovaState =
    phase === 'complete'
      ? 'celebrate'
      : phase === 'live'
        ? liveState
        : phase === 'connecting'
          ? 'thinking'
          : 'idle';
  const statusLabel =
    liveState === 'speaking'
      ? 'Nova te está enseñando'
      : liveState === 'listening'
        ? 'Tu turno: habla ahora'
        : 'Nova está pensando';
  const progress = Math.max(0, Math.min(100, (secondsLeft / DEMO_DURATION_SECONDS) * 100));

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setAdultConfirmed(false);
          setSecondsLeft(DEMO_DURATION_SECONDS);
          setError('');
          setPhase('intro');
        }}
        className="group relative flex w-full items-center gap-3 overflow-hidden rounded-2xl border border-[#7df0ff]/35 bg-[#071a31]/85 px-4 py-3.5 text-left shadow-[0_12px_40px_rgba(47,230,255,0.12)] transition hover:-translate-y-0.5 hover:border-[#7df0ff]/65 hover:bg-[#0a213d] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7df0ff]"
      >
        <span
          aria-hidden
          className="absolute inset-0 opacity-50 [background:radial-gradient(circle_at_15%_50%,rgba(124,58,237,.35),transparent_38%),radial-gradient(circle_at_90%_20%,rgba(47,230,255,.2),transparent_35%)]"
        />
        <span className="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#7c3aed] to-[#0ea5e9] shadow-[0_0_24px_rgba(47,230,255,.25)]">
          <Icon name="mic" className="size-5 text-white" />
        </span>
        <span className="relative min-w-0 flex-1">
          <span className="block text-[15px] font-bold text-white">Probar Nova por voz</span>
          <span className="block text-[12px] text-white/55">Demo para padres · 1 minuto</span>
        </span>
        <span className="relative rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#7df0ff]">
          Gratis
        </span>
      </button>

      {mounted &&
        phase !== 'closed' &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-end justify-center bg-[#02050d]/85 p-0 backdrop-blur-md sm:items-center sm:p-5"
            onMouseDown={(event) => {
              if (event.currentTarget === event.target) closeDemo();
            }}
          >
            <div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="voice-demo-title"
              tabIndex={-1}
              className="relative max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[2rem] border border-white/12 bg-[#071323] px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5 text-white shadow-[0_30px_100px_rgba(0,0,0,.75)] outline-none sm:rounded-[2rem] sm:px-7 sm:pb-7"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] [background:radial-gradient(circle_at_20%_0%,rgba(124,58,237,.23),transparent_38%),radial-gradient(circle_at_100%_45%,rgba(47,230,255,.13),transparent_36%)]"
              />
              <button
                type="button"
                onClick={closeDemo}
                aria-label={phase === 'live' ? 'Terminar demostración' : 'Cerrar demostración'}
                className="absolute right-4 top-4 z-10 flex size-10 items-center justify-center rounded-full border border-white/10 bg-black/20 text-white/65 transition hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7df0ff]"
              >
                <Icon name="exit" className="size-5" />
              </button>

              <div className="relative flex flex-col items-center text-center">
                {(phase === 'intro' || phase === 'connecting') && (
                  <>
                    <span className="rounded-full border border-[#7df0ff]/25 bg-[#7df0ff]/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#7df0ff]">
                      Experiencia de voz · 1 minuto
                    </span>
                    <NovaFace state={novaState} className="mt-3 size-28" />
                    <h2 id="voice-demo-title" className="mt-1 text-[25px] font-extrabold tracking-tight">
                      Conoce a Nova
                    </h2>
                    <p className="mt-2 max-w-[38ch] text-[14px] leading-relaxed text-white/60">
                      Vive como padre o apoderado una microclase real: Nova te escuchará, reconocerá
                      un acierto y te ayudará a mejorar una frase en inglés.
                    </p>

                    <div className="mt-5 grid w-full gap-2 text-left">
                      {PRIVACY_POINTS.map(({ icon, text }) => (
                        <div
                          key={text}
                          className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.045] px-3.5 py-3"
                        >
                          <Icon
                            name={icon}
                            className="mt-0.5 size-4 shrink-0 text-[#7df0ff]"
                          />
                          <span className="text-[12.5px] leading-relaxed text-white/62">{text}</span>
                        </div>
                      ))}
                    </div>

                    <label className="mt-4 flex w-full cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-black/15 px-3.5 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={adultConfirmed}
                        onChange={(event) => setAdultConfirmed(event.target.checked)}
                        disabled={phase === 'connecting'}
                        className="mt-0.5 size-5 shrink-0 accent-[#22d3ee]"
                      />
                      <span className="text-[12.5px] leading-relaxed text-white/70">
                        Confirmo que soy mayor de edad y usaré personalmente esta demostración.
                      </span>
                    </label>

                    <button
                      type="button"
                      disabled={!adultConfirmed || phase === 'connecting'}
                      onClick={() => void startDemo()}
                      className="btn-gradient mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-[16px] font-bold disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {phase === 'connecting' ? (
                        <>
                          <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          Conectando con Nova…
                        </>
                      ) : (
                        <>
                          <Icon name="mic" className="size-5" />
                          Empezar demo de voz
                        </>
                      )}
                    </button>
                    <p className="mt-2 text-[10.5px] leading-relaxed text-white/35">
                      La IA puede cometer errores. Esta muestra no evalúa ni crea una cuenta.
                    </p>
                  </>
                )}

                {phase === 'live' && (
                  <>
                    <audio ref={audioRef} autoPlay playsInline className="hidden" />
                    <div className="flex w-full items-center gap-3 pr-12">
                      <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#7df0ff]">
                        Demo en vivo
                      </span>
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                        <span
                          className="block h-full rounded-full bg-gradient-to-r from-[#7c3aed] to-[#22d3ee] transition-[width] duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </span>
                      <span className="tabular-nums text-[14px] font-extrabold text-white">
                        0:{String(secondsLeft).padStart(2, '0')}
                      </span>
                    </div>

                    <NovaFace
                      state={novaState}
                      stream={remoteStream}
                      reactive
                      born
                      className="mt-5 size-44"
                    />
                    <span className="mt-1 flex items-center gap-2 text-[13px] font-bold text-white/80">
                      <span
                        className={`size-2 rounded-full ${
                          liveState === 'listening'
                            ? 'animate-pulse bg-[#22d3ee]'
                            : liveState === 'speaking'
                              ? 'bg-[#c4b5fd]'
                              : 'animate-pulse bg-[#ffe08a]'
                        }`}
                      />
                      {statusLabel}
                    </span>

                    <div
                      aria-live="polite"
                      className="mt-5 flex min-h-24 w-full items-center justify-center rounded-2xl border border-white/10 bg-black/20 px-5 py-4"
                    >
                      <p className="text-[16px] font-medium leading-relaxed text-white/85">
                        {transcript || 'Nova está preparando tu primera frase…'}
                      </p>
                    </div>

                    {liveState === 'listening' && (
                      <div className="mt-4 flex h-7 items-end justify-center gap-1" aria-hidden>
                        {[12, 20, 28, 18, 25, 14, 22].map((height, index) => (
                          <span
                            key={`${height}-${index}`}
                            className="w-1 animate-pulse rounded-full bg-[#22d3ee]"
                            style={{ height, animationDelay: `${index * 80}ms` }}
                          />
                        ))}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={finishDemo}
                      className="mt-5 rounded-full border border-white/12 bg-white/[0.06] px-5 py-2.5 text-[12px] font-bold text-white/65 transition hover:bg-white/10 hover:text-white"
                    >
                      Terminar demo
                    </button>
                    <p className="mt-3 text-[10.5px] text-white/35">
                      Dirigida al adulto responsable · No compartas datos personales
                    </p>
                  </>
                )}

                {phase === 'complete' && (
                  <>
                    <span className="rounded-full border border-[#a7f3d0]/25 bg-[#34d399]/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#a7f3d0]">
                      Demo completada
                    </span>
                    <NovaFace state="celebrate" className="mt-3 size-32" />
                    <h2 id="voice-demo-title" className="mt-1 text-[25px] font-extrabold tracking-tight">
                      Imagina esta experiencia adaptada a tu hijo
                    </h2>
                    <p className="mt-2 max-w-[38ch] text-[14px] leading-relaxed text-white/60">
                      En un minuto viste cómo Nova escucha, corrige sin juzgar y ajusta el reto. Con
                      tu cuenta familiar podrás preparar el acceso de tu hijo y acompañar su progreso.
                    </p>
                    <Link
                      href={`/${locale}/register`}
                      onClick={cleanupRealtime}
                      className="btn-gradient mt-6 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-[16px] font-bold"
                    >
                      Crear cuenta familiar
                      <Icon name="arrow" className="size-5" />
                    </Link>
                    <button
                      type="button"
                      onClick={closeDemo}
                      className="mt-3 text-[13px] font-semibold text-[#7df0ff]"
                    >
                      Volver al inicio de sesión
                    </button>
                  </>
                )}

                {phase === 'error' && (
                  <>
                    <span className="mt-4 flex size-14 items-center justify-center rounded-2xl border border-[#fb7185]/25 bg-[#fb7185]/10">
                      <Icon name="mic" className="size-7 text-[#fb7185]" />
                    </span>
                    <h2 id="voice-demo-title" className="mt-4 text-[23px] font-extrabold">
                      No pudimos iniciar la voz
                    </h2>
                    <p className="mt-2 max-w-[38ch] text-[14px] leading-relaxed text-white/60">
                      {error}
                    </p>
                    {!error.includes('3 demos') && (
                      <button
                        type="button"
                        onClick={() => {
                          setPhase('intro');
                          setError('');
                        }}
                        className="btn-gradient mt-6 w-full rounded-2xl py-3.5 text-[16px] font-bold"
                      >
                        Intentar nuevamente
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={closeDemo}
                      className="mt-3 text-[13px] font-semibold text-[#7df0ff]"
                    >
                      Cerrar
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
