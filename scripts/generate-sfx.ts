// Synthesizes every sound effect in public/assets/sfx/ from code, so the
// set is licence-clean and reproducible. Run `bun run sfx` after editing a
// recipe; output is byte-stable (seeded noise), so unchanged cues diff clean.
//
// Each cue is a list of voices (oscillator + pitch path + envelope) mixed,
// loudness-matched (loudest 50 ms window hits TARGET_DB + level), and written
// as 16-bit mono WAV.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SAMPLE_RATE = 22050;
const TARGET_DB = -16;
const PEAK_LIMIT = 0.95;
const OUT_DIR = join(import.meta.dirname, '..', 'public', 'assets', 'sfx');

type Wave = 'square' | 'triangle' | 'sine' | 'noise';

type Voice = Readonly<{
  wave: Wave;
  start: number; // seconds into the cue
  length: number; // seconds
  from: number; // Hz at start (ignored for noise)
  to?: number; // Hz at end; exponential glide
  duty?: number; // square pulse width, default 0.5
  attack?: number; // seconds
  decay?: number; // exponential decay time constant; default holds then fades
  volume?: number;
  lowpass?: number; // one-pole cutoff Hz, mostly for noise
  vibrato?: number; // Hz of a gentle pitch wobble
}>;

// level: dB relative to TARGET_DB, for cues that should sit quieter or louder.
type Cue = Readonly<{
  voices: readonly Voice[];
  level?: number;
  echo?: number;
}>;

const NOTE: Record<string, number> = {
  A2: 110,
  E3: 164.81,
  A3: 220,
  C4: 261.63,
  E4: 329.63,
  G4: 392,
  A4: 440,
  B4: 493.88,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  F5: 698.46,
  G5: 783.99,
  A5: 880,
  B5: 987.77,
  C6: 1046.5,
  E6: 1318.51,
  G6: 1567.98,
  B6: 1975.53,
};

const note = (
  wave: Wave,
  name: string,
  start: number,
  length: number,
  extra: Partial<Voice> = {},
): Voice => ({
  wave,
  start,
  length,
  from: NOTE[name],
  attack: 0.004,
  ...extra,
});

const CUES: Record<string, Cue> = {
  // Soft footstep: a short filtered noise tap. Plays on every step, so quiet.
  move: {
    level: -8,
    voices: [
      {
        wave: 'noise',
        start: 0,
        length: 0.05,
        from: 0,
        decay: 0.012,
        lowpass: 1800,
      },
      {
        wave: 'triangle',
        start: 0,
        length: 0.04,
        from: 140,
        to: 90,
        decay: 0.012,
        volume: 0.6,
      },
    ],
  },
  // Walking into a wall: a dull low thud.
  bump: {
    voices: [
      {
        wave: 'square',
        start: 0,
        length: 0.1,
        from: 110,
        to: 55,
        duty: 0.25,
        decay: 0.03,
      },
      {
        wave: 'noise',
        start: 0,
        length: 0.06,
        from: 0,
        decay: 0.015,
        lowpass: 900,
        volume: 0.7,
      },
    ],
  },
  // Taking a stair: a quick rising arpeggio.
  stair: {
    echo: 0.25,
    voices: ['C5', 'E5', 'G5', 'C6'].map((n, i) =>
      note('square', n, i * 0.06, 0.09, { duty: 0.25, decay: 0.05 }),
    ),
  },
  // Reading a clue: a two-note bell shimmer.
  clue: {
    echo: 0.3,
    voices: [
      note('triangle', 'E6', 0, 0.35, { decay: 0.12 }),
      note('sine', 'B6', 0.08, 0.4, { decay: 0.14, volume: 0.7 }),
      note('sine', 'E6', 0.08, 0.4, { decay: 0.14, volume: 0.3, vibrato: 6 }),
    ],
  },
  // Opening a chest / receiving an item: bright rising chirp.
  pickup: {
    voices: [
      note('square', 'B5', 0, 0.07, { duty: 0.5 }),
      note('square', 'E6', 0.06, 0.22, { duty: 0.5, decay: 0.08 }),
    ],
  },
  // Resting at a waystone: a warm swelling sweep.
  heal: {
    echo: 0.3,
    voices: [
      {
        wave: 'triangle',
        start: 0,
        length: 0.5,
        from: NOTE.C5,
        to: NOTE.C6,
        attack: 0.08,
        decay: 0.18,
        vibrato: 7,
      },
      note('sine', 'G5', 0.15, 0.4, { attack: 0.06, decay: 0.15, volume: 0.5 }),
      note('sine', 'E6', 0.3, 0.35, {
        attack: 0.04,
        decay: 0.12,
        volume: 0.35,
      }),
    ],
  },
  // Lifting a latch: a click followed by a creaking slide.
  latch: {
    voices: [
      {
        wave: 'noise',
        start: 0,
        length: 0.03,
        from: 0,
        decay: 0.006,
        lowpass: 5000,
      },
      {
        wave: 'square',
        start: 0.04,
        length: 0.22,
        from: 180,
        to: 120,
        duty: 0.125,
        decay: 0.09,
        volume: 0.6,
      },
      {
        wave: 'noise',
        start: 0.22,
        length: 0.05,
        from: 0,
        decay: 0.012,
        lowpass: 1500,
        volume: 0.8,
      },
    ],
  },
  // Stepping up to an enemy: a tense low stab.
  encounter: {
    voices: [
      note('square', 'E4', 0, 0.12, { duty: 0.25, decay: 0.08 }),
      note('square', 'F5', 0, 0.12, { duty: 0.25, decay: 0.08, volume: 0.4 }),
      note('square', 'E4', 0.14, 0.25, { duty: 0.25, decay: 0.1 }),
      note('square', 'F5', 0.14, 0.25, { duty: 0.25, decay: 0.1, volume: 0.4 }),
    ],
  },
  // A blow landing.
  hit: {
    voices: [
      {
        wave: 'noise',
        start: 0,
        length: 0.12,
        from: 0,
        decay: 0.035,
        lowpass: 4000,
      },
      {
        wave: 'square',
        start: 0,
        length: 0.12,
        from: 330,
        to: 70,
        duty: 0.5,
        decay: 0.04,
        volume: 0.7,
      },
    ],
  },
  // Enemy defeated: a short fanfare.
  win: {
    echo: 0.25,
    voices: [
      note('square', 'G5', 0, 0.08, { duty: 0.5 }),
      note('square', 'C6', 0.08, 0.08, { duty: 0.5 }),
      note('square', 'E6', 0.16, 0.08, { duty: 0.5 }),
      note('square', 'G6', 0.24, 0.35, { duty: 0.5, decay: 0.14 }),
      note('triangle', 'C5', 0.24, 0.35, { decay: 0.14, volume: 0.6 }),
    ],
  },
  // Fight refused as unwinnable or lethal: a falling, deflated phrase.
  lose: {
    voices: [
      note('square', 'E5', 0, 0.14, { duty: 0.25 }),
      note('square', 'D5', 0.14, 0.14, { duty: 0.25 }),
      {
        wave: 'square',
        start: 0.28,
        length: 0.35,
        from: NOTE.C5,
        to: NOTE.A4,
        duty: 0.25,
        attack: 0.004,
        decay: 0.14,
        vibrato: 5,
      },
    ],
  },
  // Buying a ware: a coin "ka-ching".
  buy: {
    echo: 0.2,
    voices: [
      note('square', 'B5', 0, 0.06, { duty: 0.5 }),
      note('square', 'E6', 0.05, 0.3, { duty: 0.5, decay: 0.1 }),
      {
        wave: 'noise',
        start: 0.05,
        length: 0.15,
        from: 0,
        decay: 0.04,
        lowpass: 8000,
        volume: 0.25,
      },
    ],
  },
  // Not enough gold / sold out: a two-pulse buzzer.
  deny: {
    voices: [
      note('square', 'A2', 0, 0.08, { duty: 0.5 }),
      note('square', 'A2', 0.11, 0.12, { duty: 0.5, decay: 0.06 }),
      note('square', 'E3', 0, 0.08, { duty: 0.5, volume: 0.5 }),
      note('square', 'E3', 0.11, 0.12, { duty: 0.5, decay: 0.06, volume: 0.5 }),
    ],
  },
  // An NPC speaking: a short text blip.
  dialogue: {
    voices: [
      note('square', 'A4', 0, 0.035, { duty: 0.25 }),
      note('square', 'E5', 0.045, 0.045, { duty: 0.25, decay: 0.02 }),
    ],
  },
  // UI confirm (Fight / Buy, or a prompt opening): an upward blip.
  confirm: {
    voices: [
      note('square', 'C5', 0, 0.05, { duty: 0.125 }),
      note('square', 'G5', 0.05, 0.08, { duty: 0.125, decay: 0.04 }),
    ],
  },
  // UI cancel (Cancel / Leave): a downward blip.
  cancel: {
    voices: [
      note('square', 'G4', 0, 0.05, { duty: 0.125 }),
      note('square', 'C4', 0.05, 0.08, { duty: 0.125, decay: 0.04 }),
    ],
  },
  // A sealed entrance: two dull knocks.
  locked: {
    voices: [0, 0.13].flatMap((start) => [
      {
        wave: 'sine' as const,
        start,
        length: 0.09,
        from: 150,
        to: 90,
        decay: 0.03,
      },
      {
        wave: 'noise' as const,
        start,
        length: 0.05,
        from: 0,
        decay: 0.01,
        lowpass: 1200,
        volume: 0.6,
      },
    ]),
  },
};

// Deterministic noise so regenerating leaves unchanged files byte-identical.
function makeRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function renderVoice(
  voice: Voice,
  out: Float32Array,
  random: () => number,
): void {
  const first = Math.round(voice.start * SAMPLE_RATE);
  const count = Math.round(voice.length * SAMPLE_RATE);
  const attack = voice.attack ?? 0.002;
  const release = Math.min(0.02, voice.length / 4);
  const duty = voice.duty ?? 0.5;
  const volume = voice.volume ?? 1;
  const to = voice.to ?? voice.from;
  const alpha = voice.lowpass
    ? 1 - Math.exp((-2 * Math.PI * voice.lowpass) / SAMPLE_RATE)
    : 1;
  let phase = 0;
  let filtered = 0;

  for (let i = 0; i < count && first + i < out.length; i += 1) {
    const t = i / SAMPLE_RATE;
    const progress = i / count;
    let freq = voice.from * Math.pow(to / voice.from, progress);
    if (voice.vibrato)
      freq *= 1 + 0.012 * Math.sin(2 * Math.PI * voice.vibrato * t);
    phase = (phase + freq / SAMPLE_RATE) % 1;

    let sample: number;
    switch (voice.wave) {
      case 'square':
        sample = phase < duty ? 1 : -1;
        break;
      case 'triangle':
        sample = 4 * Math.abs(phase - 0.5) - 1;
        break;
      case 'sine':
        sample = Math.sin(2 * Math.PI * phase);
        break;
      case 'noise':
        sample = random() * 2 - 1;
        break;
    }
    filtered += alpha * (sample - filtered);

    let envelope = t < attack ? t / attack : 1;
    if (voice.decay)
      envelope *= Math.exp(-(t - Math.min(t, attack)) / voice.decay);
    const remaining = voice.length - t;
    if (remaining < release) envelope *= remaining / release;

    out[first + i] += filtered * envelope * volume;
  }
}

function renderCue(cue: Cue, seed: number): Float32Array {
  const end = Math.max(...cue.voices.map((v) => v.start + v.length));
  const echoDelay = 0.09;
  const tail = cue.echo ? echoDelay * 3 : 0;
  const out = new Float32Array(Math.ceil((end + tail) * SAMPLE_RATE));
  const random = makeRandom(seed);
  for (const voice of cue.voices) renderVoice(voice, out, random);

  if (cue.echo) {
    const delay = Math.round(echoDelay * SAMPLE_RATE);
    for (let i = delay; i < out.length; i += 1)
      out[i] += out[i - delay] * cue.echo;
  }

  const window = Math.round(0.05 * SAMPLE_RATE);
  let loudest = 0;
  let peak = 0;
  for (let i = 0; i < out.length; i += window) {
    let sum = 0;
    const slice = out.subarray(i, i + window);
    for (const s of slice) {
      sum += s * s;
      peak = Math.max(peak, Math.abs(s));
    }
    loudest = Math.max(loudest, Math.sqrt(sum / slice.length));
  }
  const target = Math.pow(10, (TARGET_DB + (cue.level ?? 0)) / 20);
  const scale = loudest > 0 ? Math.min(target / loudest, PEAK_LIMIT / peak) : 0;
  for (let i = 0; i < out.length; i += 1) out[i] *= scale;
  return out;
}

function encodeWav(samples: Float32Array): Buffer {
  const dataSize = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  samples.forEach((s, i) => {
    buffer.writeInt16LE(
      Math.round(Math.max(-1, Math.min(1, s)) * 32767),
      44 + i * 2,
    );
  });
  return buffer;
}

mkdirSync(OUT_DIR, { recursive: true });
Object.entries(CUES).forEach(([name, cue], index) => {
  const wav = encodeWav(renderCue(cue, index + 1));
  writeFileSync(join(OUT_DIR, `${name}.wav`), wav);
  console.log(`${name}.wav  ${(wav.length / 1024).toFixed(1)} KB`);
});
