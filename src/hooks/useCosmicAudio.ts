import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { UserProfile } from "../lib/types";
import { getWesternElement } from "../lib/calculators";
import type { CreativeContextMode } from "../lib/soul_weaver";
import { generateWeaveMetrics } from "../lib/soul_weaver";

export type CosmicPerspective = "mystic" | "architect";

export type CosmicSynthConfig = {
  /** Mystic uses the user's pillars. Architect uses a stable low-frequency template (165Hz). */
  perspective?: CosmicPerspective;
  /** Planetary ruler name (Sun/Moon/Mars/Mercury/Jupiter/Venus/Saturn). */
  planetaryRuler?: string;
  /** Zodiac sign (used to derive western element / timbre). */
  zodiacSign?: string;
  /** Destiny number (used for master shimmer detection). */
  destinyNumber?: number;
  /** Helix COMT status controls envelope speed. */
  comtStatus?: UserProfile["helixTraits"] extends infer T
    ? T extends { comtStatus?: infer C }
      ? C
      : string
    : string;
  /** Inner monologue style (reserved for future effects). */
  monologueStyle?: UserProfile["monologueStyle"];
  /** Overall volume 0..1 */
  volume?: number;
  /** Which ritual layer is currently active (0..3). */
  layer?: 0 | 1 | 2 | 3;
  /** Creative context affects scheduling + reverse logic. */
  contextMode?: CreativeContextMode;
  /** Life path number drives master BPM clock when sequencing is enabled. */
  lifePathNumber?: number;
  /** Enables the phase2a-style scheduler. */
  enableSequencer?: boolean;
  /** Beat callback for UI narration. */
  onBeat?: (e: {
    beat: number;
    barBeat: 0 | 1 | 2 | 3;
    contextMode: CreativeContextMode;
    scheduledAt: number;
    pillars: Array<"helix" | "solar" | "zodiac" | "earth" | "monologue" | "quantum">;
  }) => void;
};

type SynthDiagnostics = {
  perspective: CosmicPerspective;
  f0Hz: number;
  waveform: OscillatorType | "earth-hybrid";
  shimmerHz: number | null;
  envelope: { attackSeconds: number; decaySeconds: number; sustainLevel: number };
};

type CosmicAudioControls = {
  isRunning: boolean;
  start: () => Promise<void>;
  stop: () => void;
  setConfig: (next: Partial<CosmicSynthConfig>) => void;
  /** Returns current synth parameters (for UI copy). */
  getDiagnostics: () => SynthDiagnostics | null;
  /** Copies current waveform into a buffer for canvas oscilloscope. */
  getTimeDomainData: () => Uint8Array | null;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Cosmic Synth (Soul Tone):
 * - Fundamental frequency (planetary ruler) per `grand_unified_theory.md`
 * - Optional harmonic shimmer for master numbers (11/22/33)
 * - Timbre by Western element (Fire/Water/Air/Earth)
 * - Envelope by Helix COMT (Warrior fast, Worrier slow)
 *
 * Also exposes an AnalyserNode so a canvas can render an oscilloscope.
 */
export function useCosmicAudio(initial?: CosmicSynthConfig): CosmicAudioControls {
  const [isRunning, setIsRunning] = useState(false);

  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const timeDomainRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const timerRef = useRef<number | null>(null);
  const beatCountRef = useRef(0);
  const nextNoteTimeRef = useRef(0);
  const scheduledNodesRef = useRef<Array<AudioNode>>([]);

  // Nodes we need to update in real-time:
  const mainOscRef = useRef<OscillatorNode | null>(null);
  const earthHybridSineRef = useRef<OscillatorNode | null>(null);
  const earthHybridSquareRef = useRef<OscillatorNode | null>(null);
  const shimmerOscRef = useRef<OscillatorNode | null>(null);
  const voiceGainRef = useRef<GainNode | null>(null);
  const shimmerGainRef = useRef<GainNode | null>(null);

  const configRef = useRef<CosmicSynthConfig>({
    perspective: initial?.perspective ?? "mystic",
    planetaryRuler: initial?.planetaryRuler,
    zodiacSign: initial?.zodiacSign,
    destinyNumber: initial?.destinyNumber,
    comtStatus: initial?.comtStatus,
    monologueStyle: initial?.monologueStyle,
    volume: initial?.volume,
    layer: initial?.layer ?? 0,
    contextMode: initial?.contextMode ?? "selection",
    lifePathNumber: initial?.lifePathNumber,
    enableSequencer: initial?.enableSequencer ?? false,
    onBeat: initial?.onBeat,
  });

  const mkOsc = useCallback(
    (
      ctx: AudioContext,
      out: AudioNode,
      freq: number,
      type: OscillatorType,
      durSeconds: number,
      vol: number,
      whenSeconds: number
    ) => {
      const t = ctx.currentTime + whenSeconds;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, t + durSeconds);
      o.connect(g);
      g.connect(out);
      o.start(t);
      o.stop(t + durSeconds);
      scheduledNodesRef.current.push(o, g);
    },
    []
  );

  const mkNoise = useCallback(
    (
      ctx: AudioContext,
      out: AudioNode,
      durSeconds: number,
      vol: number,
      whenSeconds: number,
      filterType: BiquadFilterType | null,
      filterFreq: number
    ) => {
      const t = ctx.currentTime + whenSeconds;
      const bs = Math.max(1, Math.floor(2 * ctx.sampleRate));
      const b = ctx.createBuffer(1, bs, ctx.sampleRate);
      const d = b.getChannelData(0);
      for (let i = 0; i < bs; i++) d[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = b;
      src.loop = true;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, t + durSeconds);

      let node: AudioNode = src;
      if (filterType) {
        const f = ctx.createBiquadFilter();
        f.type = filterType;
        f.frequency.value = filterFreq;
        src.connect(f);
        node = f;
        scheduledNodesRef.current.push(f);
      }

      node.connect(g);
      g.connect(out);
      src.start(t);
      src.stop(t + durSeconds);
      scheduledNodesRef.current.push(src, g);
    },
    []
  );

  const clearScheduler = useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopScheduledNodes = useCallback(() => {
    const now = ctxRef.current?.currentTime ?? 0;
    for (const n of scheduledNodesRef.current) {
      try {
        // OscillatorNode / AudioScheduledSourceNode
        (n as any).stop?.(now);
      } catch {}
      try {
        n.disconnect?.();
      } catch {}
    }
    scheduledNodesRef.current = [];
  }, []);

  const schedulerTick = useCallback(() => {
    const ctx = ctxRef.current;
    const analyser = analyserRef.current;
    if (!ctx || !analyser) return;

    const cfg = configRef.current;
    if (!cfg.enableSequencer) return;

    const lookaheadMs = 25.0;
    const scheduleAheadSeconds = 0.1;

    const metrics = generateWeaveMetrics(
      {
        // minimal shape for metrics
        ...({} as UserProfile),
        zodiacSign: cfg.zodiacSign ?? "",
        planetaryRuler: cfg.planetaryRuler ?? "",
        destinyNumber: cfg.destinyNumber ?? 0,
        lifePathNumber: cfg.lifePathNumber ?? 0,
        tarotArchetype: "",
        name: "",
        email: "",
        role: "user",
        birthday: "",
        birthTime: "",
        birthLocation: "",
        favoriteColor: "",
        favoriteNumber: "",
        subscriptionTier: "Free",
        joinDate: new Date().toISOString(),
      } as unknown as UserProfile,
      cfg.contextMode ?? "selection"
    );

    const secondsPerBeat = metrics.secondsPerBeat;
    const bpm = metrics.bpm;

    // Initialize nextNoteTime if needed.
    if (nextNoteTimeRef.current < ctx.currentTime) {
      nextNoteTimeRef.current = ctx.currentTime + 0.1;
    }

    const scheduleNote = () => {
      const beatCount = beatCountRef.current;
      const barBeat = (beatCount % 4) as 0 | 1 | 2 | 3;
      const t = nextNoteTimeRef.current - ctx.currentTime;
      const mode = cfg.contextMode ?? "selection";
      const isShadow = mode === "shadow";

      // --- PULSE RECOMBINATION ---
      // Kick = Helix/Sun pillars (Beat 1; shadow flips to Beat 4)
      if (mode !== "subtraction") {
        if ((!isShadow && barBeat === 0) || (isShadow && barBeat === 3)) {
          const kickBase = Math.max(30, Math.min(90, metrics.f0Hz / 2));
          const kickVol = cfg.comtStatus?.toString().startsWith("Warrior") ? 0.9 : 0.75;
          mkOsc(ctx, analyser, kickBase, "sine", 0.8, kickVol, t);
          mkNoise(ctx, analyser, 0.3, 0.45, t, "lowpass", 150);
          cfg.onBeat?.({
            beat: beatCount,
            barBeat,
            contextMode: mode,
            scheduledAt: nextNoteTimeRef.current,
            pillars: ["helix", "solar"],
          });
        }

        // Snare placeholder: (not requested explicitly in v2.5 mapping, keep subtle)
        if ((!isShadow && barBeat === 2) || (isShadow && barBeat === 1)) {
          mkNoise(ctx, analyser, 0.25, 0.35, t, "bandpass", 1800);
        }

        // Percussion = Monologue/Quantum pillars (every beat)
        const hatHz = isShadow ? 800 : 2200 + Math.random() * 900;
        const hatVol =
          cfg.monologueStyle === "Anauralic" || cfg.monologueStyle === "Anendophasic" ? 0.06 : 0.1;
        mkOsc(ctx, analyser, hatHz, "sine", 0.05, hatVol, t);
        cfg.onBeat?.({
          beat: beatCount,
          barBeat,
          contextMode: mode,
          scheduledAt: nextNoteTimeRef.current,
          pillars: ["monologue", "quantum"],
        });
      }

      // Pad = Zodiac/Earth pillars (every beat, sustained)
      const padVol = mode === "subtraction" ? 0.6 : 0.2;
      if (mode === "selection") {
        mkOsc(ctx, analyser, isShadow ? 150 : 100, "sine", secondsPerBeat, padVol, t);
      } else {
        mkNoise(ctx, analyser, secondsPerBeat, padVol * 0.5, t, isShadow ? "lowpass" : "highpass", 500);
        mkOsc(ctx, analyser, isShadow ? 100 : 220, "sine", secondsPerBeat, padVol * 0.5, t);
      }
      cfg.onBeat?.({
        beat: beatCount,
        barBeat,
        contextMode: mode,
        scheduledAt: nextNoteTimeRef.current,
        pillars: ["zodiac", "earth"],
      });

      nextNoteTimeRef.current += secondsPerBeat;
      beatCountRef.current += 1;

      // Keep UI BPM display available via diagnostics (already)
      void bpm;
    };

    while (nextNoteTimeRef.current < ctx.currentTime + scheduleAheadSeconds) {
      scheduleNote();
    }

    timerRef.current = window.setTimeout(schedulerTick, lookaheadMs);
  }, [mkNoise, mkOsc]);

  const computeF0Hz = useCallback((cfg: CosmicSynthConfig): number => {
    const perspective = cfg.perspective ?? "mystic";
    if (perspective === "architect") return 165; // template drone

    const p = (cfg.planetaryRuler ?? "").toLowerCase().trim();
    if (p === "sun") return 126.22;
    if (p === "moon") return 210.42;
    if (p === "mars") return 144.72;
    if (p === "mercury") return 141.27;
    if (p === "jupiter") return 183.58;
    if (p === "venus") return 221.23;
    if (p === "saturn") return 147.85;
    return 126.22;
  }, []);

  const computeWaveform = useCallback((cfg: CosmicSynthConfig): SynthDiagnostics["waveform"] => {
    const perspective = cfg.perspective ?? "mystic";
    if (perspective === "architect") return "sine";

    const element = getWesternElement(cfg.zodiacSign ?? "");
    if (element === "Fire") return "sawtooth";
    if (element === "Water") return "sine";
    if (element === "Air") return "triangle";
    if (element === "Earth") return "earth-hybrid";
    return "sine";
  }, []);

  const computeShimmerHz = useCallback((cfg: CosmicSynthConfig): number | null => {
    const perspective = cfg.perspective ?? "mystic";
    if (perspective === "architect") return null;
    const n = cfg.destinyNumber;
    if (n === 11) return 440;
    if (n === 22) return 880;
    if (n === 33) return 1320;
    return null;
  }, []);

  const computeEnvelope = useCallback((cfg: CosmicSynthConfig): SynthDiagnostics["envelope"] => {
    const c = (cfg.comtStatus ?? "Unknown") as string;
    // Per mission: Warrior = fast attack (0.1s), Worrier = slow attack (2.0s)
    if (c.startsWith("Warrior")) {
      return { attackSeconds: 0.1, decaySeconds: 0.25, sustainLevel: 0.65 };
    }
    if (c.startsWith("Worrier")) {
      return { attackSeconds: 2.0, decaySeconds: 0.6, sustainLevel: 0.9 };
    }
    if (c === "Balanced") {
      return { attackSeconds: 0.6, decaySeconds: 0.35, sustainLevel: 0.8 };
    }
    return { attackSeconds: 0.45, decaySeconds: 0.35, sustainLevel: 0.75 };
  }, []);

  const start = useCallback(async () => {
    if (ctxRef.current && isRunning) return;

    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    ctxRef.current = ctx;

    const master = ctx.createGain();
    master.gain.value = clamp(configRef.current.volume ?? 0.12, 0, 1);
    masterRef.current = master;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyserRef.current = analyser;
    timeDomainRef.current = new Uint8Array(analyser.fftSize) as Uint8Array<ArrayBuffer>;

    const voiceGain = ctx.createGain();
    voiceGain.gain.value = 0;
    voiceGainRef.current = voiceGain;

    const shimmerGain = ctx.createGain();
    shimmerGain.gain.value = 0;
    shimmerGainRef.current = shimmerGain;

    // --- Build oscillators from current config ---
    const cfg = configRef.current;
    const f0Hz = computeF0Hz(cfg);
    const waveform = computeWaveform(cfg);
    const shimmerHz = computeShimmerHz(cfg);

    // Main voice: Earth uses hybrid (sine+square). Others use a single oscillator.
    if (waveform === "earth-hybrid") {
      const s = ctx.createOscillator();
      const q = ctx.createOscillator();
      s.type = "sine";
      q.type = "square";
      s.frequency.value = f0Hz;
      q.frequency.value = f0Hz;
      const gS = ctx.createGain();
      const gQ = ctx.createGain();
      gS.gain.value = 0.65;
      gQ.gain.value = 0.35;
      s.connect(gS);
      q.connect(gQ);
      gS.connect(voiceGain);
      gQ.connect(voiceGain);
      earthHybridSineRef.current = s;
      earthHybridSquareRef.current = q;
    } else {
      const osc = ctx.createOscillator();
      osc.type = waveform as OscillatorType;
      osc.frequency.value = f0Hz;
      osc.connect(voiceGain);
      mainOscRef.current = osc;
    }

    if (shimmerHz) {
      const sh = ctx.createOscillator();
      sh.type = waveform === "earth-hybrid" ? "sine" : (waveform as OscillatorType);
      sh.frequency.value = shimmerHz;
      sh.connect(shimmerGain);
      shimmerOscRef.current = sh;
    }

    // Wire: (voice + shimmer) -> analyser -> master -> destination
    voiceGain.connect(analyser);
    shimmerGain.connect(analyser);
    analyser.connect(master);
    master.connect(ctx.destination);

    // Start oscillators
    mainOscRef.current?.start();
    earthHybridSineRef.current?.start();
    earthHybridSquareRef.current?.start();
    shimmerOscRef.current?.start();

    // Apply envelope and layer gating
    const env = computeEnvelope(cfg);
    const layer = cfg.layer ?? 0;
    const now = ctx.currentTime;
    const targetMain =
      layer >= 1 ? 1 : 0;
    const targetShimmer =
      layer >= 2 ? 0.55 : 0;

    voiceGain.gain.cancelScheduledValues(now);
    shimmerGain.gain.cancelScheduledValues(now);

    voiceGain.gain.setValueAtTime(0, now);
    shimmerGain.gain.setValueAtTime(0, now);

    // ADS envelope to sustain. (release handled in stop())
    voiceGain.gain.linearRampToValueAtTime(targetMain, now + env.attackSeconds);
    voiceGain.gain.linearRampToValueAtTime(
      targetMain * env.sustainLevel,
      now + env.attackSeconds + env.decaySeconds
    );
    shimmerGain.gain.linearRampToValueAtTime(targetShimmer, now + env.attackSeconds);

    setIsRunning(true);

    // Start scheduler if enabled
    clearScheduler();
    beatCountRef.current = 0;
    nextNoteTimeRef.current = ctx.currentTime + 0.1;
    if (configRef.current.enableSequencer) {
      schedulerTick();
    }
  }, [computeEnvelope, computeF0Hz, computeShimmerHz, computeWaveform, isRunning]);

  const stop = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;

    clearScheduler();
    stopScheduledNodes();

    const now = ctx.currentTime;
    const release = 0.6;
    const voiceGain = voiceGainRef.current;
    const shimmerGain = shimmerGainRef.current;

    if (voiceGain) {
      voiceGain.gain.cancelScheduledValues(now);
      voiceGain.gain.setTargetAtTime(0, now, 0.08);
    }
    if (shimmerGain) {
      shimmerGain.gain.cancelScheduledValues(now);
      shimmerGain.gain.setTargetAtTime(0, now, 0.08);
    }

    const stopAt = now + release;
    try { mainOscRef.current?.stop(stopAt); } catch {}
    try { earthHybridSineRef.current?.stop(stopAt); } catch {}
    try { earthHybridSquareRef.current?.stop(stopAt); } catch {}
    try { shimmerOscRef.current?.stop(stopAt); } catch {}

    mainOscRef.current = null;
    earthHybridSineRef.current = null;
    earthHybridSquareRef.current = null;
    shimmerOscRef.current = null;
    analyserRef.current = null;
    voiceGainRef.current = null;
    shimmerGainRef.current = null;

    // Close context
    ctx.close().catch(() => {});
    ctxRef.current = null;
    masterRef.current = null;

    setIsRunning(false);
  }, []);

  const applyConfigToRunningGraph = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;

    const cfg = configRef.current;
    const f0Hz = computeF0Hz(cfg);
    const shimmerHz = computeShimmerHz(cfg);
    const env = computeEnvelope(cfg);
    const layer = cfg.layer ?? 0;
    const now = ctx.currentTime;

    // Retune fundamentals
    if (mainOscRef.current) {
      mainOscRef.current.frequency.setTargetAtTime(f0Hz, now, 0.03);
    }
    if (earthHybridSineRef.current) {
      earthHybridSineRef.current.frequency.setTargetAtTime(f0Hz, now, 0.03);
    }
    if (earthHybridSquareRef.current) {
      earthHybridSquareRef.current.frequency.setTargetAtTime(f0Hz, now, 0.03);
    }
    if (shimmerOscRef.current && shimmerHz) {
      shimmerOscRef.current.frequency.setTargetAtTime(shimmerHz, now, 0.03);
    }

    // Volume
    const master = masterRef.current;
    if (master) {
      master.gain.setTargetAtTime(clamp(cfg.volume ?? 0.12, 0, 1), now, 0.04);
    }

    // Layer gating (re-apply envelope quickly when advancing)
    const voiceGain = voiceGainRef.current;
    const shimmerGain = shimmerGainRef.current;
    if (voiceGain) {
      const targetMain = layer >= 1 ? 1 : 0;
      voiceGain.gain.cancelScheduledValues(now);
      voiceGain.gain.linearRampToValueAtTime(targetMain, now + Math.min(0.3, env.attackSeconds));
      voiceGain.gain.linearRampToValueAtTime(
        targetMain * env.sustainLevel,
        now + Math.min(0.3, env.attackSeconds) + Math.min(0.25, env.decaySeconds)
      );
    }
    if (shimmerGain) {
      const targetShimmer = layer >= 2 ? 0.55 : 0;
      shimmerGain.gain.cancelScheduledValues(now);
      shimmerGain.gain.setTargetAtTime(targetShimmer, now, 0.06);
    }

    // Scheduler enable/disable
    clearScheduler();
    if (cfg.enableSequencer) {
      schedulerTick();
    }
  }, [computeEnvelope, computeF0Hz, computeShimmerHz]);

  const setConfig = useCallback(
    (next: Partial<CosmicSynthConfig>) => {
      configRef.current = { ...configRef.current, ...next };
      if (ctxRef.current) applyConfigToRunningGraph();
    },
    [applyConfigToRunningGraph]
  );

  const getDiagnostics = useCallback((): SynthDiagnostics | null => {
    const cfg = configRef.current;
    return {
      perspective: cfg.perspective ?? "mystic",
      f0Hz: computeF0Hz(cfg),
      waveform: computeWaveform(cfg),
      shimmerHz: computeShimmerHz(cfg),
      envelope: computeEnvelope(cfg),
    };
  }, [computeEnvelope, computeF0Hz, computeShimmerHz, computeWaveform]);

  const getTimeDomainData = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return null;
    const buf = timeDomainRef.current;
    if (!buf) return null;
    analyser.getByteTimeDomainData(buf);
    return buf;
  }, []);

  // Cleanup on unmount
  useEffect(() => stop, [stop]);

  return useMemo(
    () => ({
      isRunning,
      start,
      stop,
      setConfig,
      getDiagnostics,
      getTimeDomainData,
    }),
    [getDiagnostics, getTimeDomainData, isRunning, setConfig, start, stop]
  );
}

