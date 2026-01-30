import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { EntanglementSettings } from "../utils/sonification";

type CosmicAudioControls = {
  isRunning: boolean;
  start: () => Promise<void>;
  stop: () => void;
  setEntanglement: (settings: EntanglementSettings) => void;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Universe Drone:
 * - Cosmic Floor: "pink-ish" noise (white noise buffer -> low-pass shaping)
 * - Anchor: low B♭ sine (approximates the concept, since 57 octaves below is sub-audible)
 * - Entanglement modulation: bitcrush + high-pass cutoff shift in real-time
 */
export function useCosmicAudio(initial?: EntanglementSettings): CosmicAudioControls {
  const [isRunning, setIsRunning] = useState(false);

  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);

  // Nodes we need to update in real-time:
  const hpFilterRef = useRef<BiquadFilterNode | null>(null);
  const bitCrusherRef = useRef<ScriptProcessorNode | null>(null);
  const noiseSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const anchorOscRef = useRef<OscillatorNode | null>(null);

  const entanglementRef = useRef<EntanglementSettings | null>(initial ?? null);

  const createNoiseBuffer = useCallback((ctx: AudioContext, seconds: number) => {
    const sampleRate = ctx.sampleRate;
    const length = Math.max(1, Math.floor(sampleRate * seconds));
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1; // white noise
    }
    return buffer;
  }, []);

  const start = useCallback(async () => {
    if (ctxRef.current && isRunning) return;

    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    ctxRef.current = ctx;

    const master = ctx.createGain();
    master.gain.value = 0.12;
    masterRef.current = master;

    // --- Pink-ish noise floor ---
    const noise = ctx.createBufferSource();
    noise.buffer = createNoiseBuffer(ctx, 2.5);
    noise.loop = true;

    // Low-pass shaping to approximate pink-ish characteristics (requirement)
    const pinkLP = ctx.createBiquadFilter();
    pinkLP.type = "lowpass";
    pinkLP.frequency.value = 900;
    pinkLP.Q.value = 0.7;

    // Entanglement filter (distant = high-pass cutoff rises)
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = initial?.filterCutoffHz ?? 120;
    hp.Q.value = 0.707;
    hpFilterRef.current = hp;

    // Bitcrusher (ScriptProcessorNode; broadly supported)
    const crusher = ctx.createScriptProcessor(4096, 1, 1);
    bitCrusherRef.current = crusher;

    let phaser = 0;
    let last = 0;
    crusher.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0);
      const output = e.outputBuffer.getChannelData(0);

      const settings = entanglementRef.current;
      const crush = settings ? clamp(settings.bitCrushAmount, 0, 1) : 0;

      // Map crush 0..1 to bit depth 16..4 and sample-rate reduction 1..12
      const bits = Math.round(16 - crush * 12); // 16 -> 4
      const step = Math.pow(0.5, bits);
      const reduction = Math.max(1, Math.round(1 + crush * 11)); // 1..12

      for (let i = 0; i < input.length; i++) {
        phaser++;
        if (phaser >= reduction) {
          phaser = 0;
          last = step * Math.floor(input[i] / step + 0.5);
        }
        output[i] = last;
      }
    };

    // --- Anchor drone ---
    const anchorOsc = ctx.createOscillator();
    anchorOsc.type = "sine";
    // B♭0 ~ 29.14Hz (audible anchor approximation)
    anchorOsc.frequency.value = 29.14;

    const anchorGain = ctx.createGain();
    anchorGain.gain.value = 0.05;

    // --- Wiring ---
    noise.connect(pinkLP);
    pinkLP.connect(hp);
    hp.connect(crusher);

    anchorOsc.connect(anchorGain);
    anchorGain.connect(crusher);

    crusher.connect(master);
    master.connect(ctx.destination);

    // Start sources
    noise.start();
    anchorOsc.start();

    noiseSourceRef.current = noise;
    anchorOscRef.current = anchorOsc;

    // Apply initial entanglement if present
    if (initial) {
      entanglementRef.current = initial;
      hp.frequency.setTargetAtTime(initial.filterCutoffHz, ctx.currentTime, 0.02);
    }

    setIsRunning(true);
  }, [createNoiseBuffer, initial, isRunning]);

  const stop = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;

    try {
      noiseSourceRef.current?.stop();
    } catch {
      // ignore
    }
    try {
      anchorOscRef.current?.stop();
    } catch {
      // ignore
    }

    noiseSourceRef.current = null;
    anchorOscRef.current = null;
    hpFilterRef.current = null;
    bitCrusherRef.current = null;

    // Close context
    ctx.close().catch(() => {});
    ctxRef.current = null;
    masterRef.current = null;

    setIsRunning(false);
  }, []);

  const setEntanglement = useCallback((settings: EntanglementSettings) => {
    entanglementRef.current = settings;
    const ctx = ctxRef.current;
    const hp = hpFilterRef.current;
    if (ctx && hp) {
      hp.frequency.setTargetAtTime(settings.filterCutoffHz, ctx.currentTime, 0.03);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => stop, [stop]);

  return useMemo(
    () => ({
      isRunning,
      start,
      stop,
      setEntanglement,
    }),
    [isRunning, start, stop, setEntanglement]
  );
}

