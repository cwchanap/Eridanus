// Turns a raw ElevenLabs Sound Effects take (any format ffmpeg reads) into
// the game-ready public/assets/sfx/<cue>.wav: mono 44.1 kHz 16-bit, leading
// silence and tail trimmed, faded, and loudness-matched to the other cues.
//
//   bun run sfx <cue> <take.mp3> [out.wav]
//
// To redo a cue: generate new takes in ElevenLabs (model
// eleven_text_to_sound_v2) from the prompt and duration below, pick one, and
// run this on it. Needs ffmpeg on PATH.

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
      'Single soft footstep on stone floor, short dry tap, retro fantasy RPG game sound',
    duration: 0.5,
    maxLength: 0.2,
    level: -8, // plays on every step
  },
  bump: {
    prompt:
      'Dull low thud of bumping into a stone wall, short muffled impact, retro fantasy RPG game sound',
    duration: 0.5,
    maxLength: 0.3,
  },
  stair: {
    prompt:
      'Quick footsteps climbing stone stairs with a rising magical whoosh, retro fantasy RPG floor transition sound',
    duration: 1,
  },
  clue: {
    prompt:
      'Mysterious soft chime of glowing ancient runes, shimmering bell tone, fantasy RPG discovery sound',
    duration: 1,
  },
  pickup: {
    prompt:
      'Wooden treasure chest creaking open with a bright sparkling item pickup jingle, fantasy RPG game sound',
    duration: 0.8,
  },
  heal: {
    prompt:
      'Warm rising healing magic shimmer, gentle sparkling harp-like swell, fantasy RPG restore health sound',
    duration: 1.2,
  },
  latch: {
    prompt:
      'Heavy iron gate latch clicking open followed by a short metal creak, close-mic, dungeon game sound',
    duration: 0.8,
  },
  encounter: {
    prompt:
      'Tense sword being drawn from a scabbard with a low ominous stinger, fantasy RPG enemy encounter sound',
    duration: 0.8,
  },
  hit: {
    prompt:
      'Single sharp sword slash hitting armor, punchy impact, fantasy RPG combat hit sound',
    duration: 0.5,
    maxLength: 0.35,
  },
  win: {
    prompt:
      'Short triumphant brass fanfare sting, victory after defeating a monster, fantasy RPG game sound',
    duration: 1.5,
  },
  lose: {
    prompt:
      'Short descending ominous low tone, failure warning, too dangerous to fight, fantasy RPG game sound',
    duration: 1,
  },
  buy: {
    prompt:
      'Handful of gold coins dropped on a wooden shop counter, bright clinking, fantasy RPG purchase sound',
    duration: 0.8,
  },
  deny: {
    prompt:
      'Short low error buzz, two quick dull blips, action not allowed, retro RPG menu sound',
    duration: 0.5,
    maxLength: 0.3,
  },
  dialogue: {
    prompt:
      'Short soft text dialogue blip, quick wooden tick, retro RPG speech box sound',
    duration: 0.5,
    maxLength: 0.2,
    level: -3,
  },
  confirm: {
    prompt:
      'Short bright upward menu select click, clean UI confirm tone, fantasy RPG interface sound',
    duration: 0.5,
    maxLength: 0.3,
  },
  cancel: {
    prompt:
      'Short soft downward menu back click, UI cancel tone, fantasy RPG interface sound',
    duration: 0.5,
    maxLength: 0.3,
  },
  locked: {
    prompt:
      'Two dull knocks on a heavy sealed stone door, rattling locked handle, dungeon game sound',
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
