// Turns a raw ElevenLabs Sound Effects take (any format ffmpeg reads) into
// the game-ready public/assets/sfx/<cue>.wav: mono 44.1 kHz 16-bit, leading
// silence and tail trimmed, faded, and loudness-matched to the other cues.
//
//   bun run sfx <cue> <take.mp3> [out.wav]
//
// To redo a cue: generate new takes in ElevenLabs (model
// eleven_text_to_sound_v2, prompt influence 0.7) from the prompt and duration
// below, pick one, and run this on it. Needs ffmpeg on PATH.

import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SAMPLE_RATE = 44100;
const TARGET_DB = -18; // loudest 50 ms window, before `level`
const PEAK_LIMIT = 0.95;

type CueSpec = Readonly<{
  prompt: string;
  duration: number; // seconds requested from ElevenLabs
  maxLength?: number; // seconds kept after the onset
  level?: number; // dB relative to TARGET_DB
}>;

const CUES: Record<string, CueSpec> = {
  move: {
    prompt:
      'Tiny soft footstep blip on stone, short 16-bit retro JRPG chiptune tick',
    duration: 0.5,
    maxLength: 0.2,
    level: -8, // plays on every step
  },
  bump: {
    prompt:
      'Short dull low bump against a wall, muffled 16-bit retro JRPG chiptune thud',
    duration: 0.5,
    maxLength: 0.3,
  },
  stair: {
    prompt:
      'Stairway warp to the next tower floor, quick rising 16-bit retro JRPG chiptune arpeggio with starry sparkle',
    duration: 1,
  },
  clue: {
    prompt:
      'Secret discovered chime, mysterious twinkling starlight bell arpeggio, 16-bit retro JRPG chiptune',
    duration: 1,
  },
  pickup: {
    prompt:
      'Treasure chest item get jingle, bright short sparkling 16-bit retro JRPG chiptune fanfare',
    duration: 0.8,
  },
  heal: {
    prompt:
      'Healing spell, gentle rising celestial sparkle shimmer, 16-bit retro JRPG chiptune',
    duration: 1.2,
  },
  latch: {
    prompt:
      'Gate unlock, short metallic click then door opening, 16-bit retro JRPG chiptune',
    duration: 0.8,
  },
  encounter: {
    prompt:
      'Monster encounter sting, quick tense swoosh and low ominous hit, 16-bit retro JRPG chiptune',
    duration: 0.8,
  },
  hit: {
    prompt:
      'Sword attack hit, short crunchy impact, 16-bit retro JRPG chiptune',
    duration: 0.5,
    maxLength: 0.35,
  },
  win: {
    prompt:
      'Battle victory fanfare sting, short triumphant 16-bit retro JRPG chiptune melody',
    duration: 1.5,
  },
  lose: {
    prompt:
      'Failure warning, short descending sad tones, 16-bit retro JRPG chiptune',
    duration: 1,
  },
  buy: {
    prompt:
      'Shop purchase, bright coin clink ka-ching, 16-bit retro JRPG chiptune',
    duration: 0.8,
  },
  deny: {
    prompt:
      'Menu error buzzer, short low double beep, 16-bit retro JRPG chiptune',
    duration: 0.5,
    maxLength: 0.3,
  },
  dialogue: {
    prompt: 'Text box blip, single short soft beep, 16-bit retro JRPG chiptune',
    duration: 0.5,
    maxLength: 0.2,
    level: -3,
  },
  confirm: {
    prompt:
      'Menu confirm, short bright rising blip, 16-bit retro JRPG chiptune',
    duration: 0.5,
    maxLength: 0.3,
  },
  cancel: {
    prompt: 'Menu cancel, short soft falling blip, 16-bit retro JRPG chiptune',
    duration: 0.5,
    maxLength: 0.3,
  },
  locked: {
    prompt:
      'Locked door, two dull knocks and a low denied tone, 16-bit retro JRPG chiptune',
    duration: 0.8,
  },
};

function decode(path: string): Float32Array {
  const result = spawnSync(
    'ffmpeg',
    [
      '-v',
      'error',
      '-i',
      path,
      '-ac',
      '1',
      '-ar',
      String(SAMPLE_RATE),
      '-f',
      'f32le',
      '-',
    ],
    { maxBuffer: 64 * 1024 * 1024 },
  );
  if (result.status !== 0) throw new Error(`ffmpeg failed: ${result.stderr}`);
  const bytes = result.stdout;
  return new Float32Array(
    bytes.buffer,
    bytes.byteOffset,
    bytes.length / 4,
  ).slice();
}

// RMS over a sliding window centred on each sample.
function envelope(samples: Float32Array, seconds: number): Float32Array {
  const half = Math.max(1, Math.round((seconds * SAMPLE_RATE) / 2));
  const out = new Float32Array(samples.length);
  let sum = 0;
  for (let i = -half; i < samples.length; i += 1) {
    const enter = i + half;
    const leave = i - half - 1;
    if (enter < samples.length) sum += samples[enter] ** 2;
    if (leave >= 0) sum -= samples[leave] ** 2;
    if (i >= 0) out[i] = Math.sqrt(Math.max(0, sum) / (2 * half + 1));
  }
  return out;
}

function shape(samples: Float32Array, spec: CueSpec): Float32Array {
  const env = envelope(samples, 0.005);
  const loudest = env.reduce((max, v) => Math.max(max, v), 0);
  const onsetIndex = env.findIndex((v) => v > loudest * 10 ** (-30 / 20));
  const start = Math.max(0, onsetIndex - Math.round(0.003 * SAMPLE_RATE));
  let end = start;
  env.forEach((v, i) => {
    if (v > loudest * 10 ** (-40 / 20)) end = i;
  });
  if (spec.maxLength)
    end = Math.min(end, start + Math.round(spec.maxLength * SAMPLE_RATE));
  const out = samples.slice(start, end + 1);

  const fadeIn = Math.round(0.003 * SAMPLE_RATE);
  const fadeOut = Math.min(
    Math.round(0.04 * SAMPLE_RATE),
    Math.floor(out.length / 4),
  );
  for (let i = 0; i < fadeIn && i < out.length; i += 1) out[i] *= i / fadeIn;
  for (let i = 0; i < fadeOut; i += 1) out[out.length - 1 - i] *= i / fadeOut;

  const window = Math.round(0.05 * SAMPLE_RATE);
  let windowRms = 0;
  let peak = 0;
  for (let i = 0; i < out.length; i += window) {
    const slice = out.subarray(i, i + window);
    let sum = 0;
    for (const s of slice) {
      sum += s * s;
      peak = Math.max(peak, Math.abs(s));
    }
    windowRms = Math.max(windowRms, Math.sqrt(sum / slice.length));
  }
  const target = 10 ** ((TARGET_DB + (spec.level ?? 0)) / 20);
  const scale = Math.min(target / windowRms, PEAK_LIMIT / peak);
  return out.map((s) => s * scale);
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

const [cue, input, output] = process.argv.slice(2);
const spec = CUES[cue];
if (!spec || !input) {
  console.error(
    `usage: bun run sfx <cue> <take> [out.wav]\ncues: ${Object.keys(CUES).join(', ')}`,
  );
  process.exit(1);
}
const outPath =
  output ??
  join(import.meta.dirname, '..', 'public', 'assets', 'sfx', `${cue}.wav`);
const wav = encodeWav(shape(decode(input), spec));
writeFileSync(outPath, wav);
console.log(`${outPath}  ${(wav.length / 1024).toFixed(1)} KB`);
