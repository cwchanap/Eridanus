// Sound effects. Every cue has a synthesized WebAudio placeholder; listing a
// cue in SFX_FILES plays public/assets/sfx/<cue>.wav instead. Which cue a
// game event plays is decided in cues.ts, never here.

export type SfxCue =
  | 'move'
  | 'bump'
  | 'stair'
  | 'clue'
  | 'pickup'
  | 'heal'
  | 'latch'
  | 'encounter'
  | 'hit'
  | 'win'
  | 'lose'
  | 'buy'
  | 'deny'
  | 'dialogue'
  | 'confirm'
  | 'cancel'
  | 'locked';

// Cues with a recorded file. Add a cue here once its .wav is in place.
export const SFX_FILES: ReadonlySet<SfxCue> = new Set<SfxCue>([
  'move',
  'bump',
  'stair',
  'clue',
  'pickup',
  'heal',
  'latch',
  'encounter',
  'hit',
  'win',
  'lose',
  'buy',
  'deny',
  'dialogue',
  'confirm',
  'cancel',
  'locked',
]);

// One oscillator blip: starts `at` seconds into the cue, optionally sliding
// to `to` Hz over its duration.
type Tone = Readonly<{
  freq: number;
  dur: number;
  at?: number;
  to?: number;
  wave?: OscillatorType;
  gain?: number;
}>;

const SYNTH: Record<SfxCue, readonly Tone[]> = {
  move: [{ freq: 220, dur: 0.035, wave: 'triangle', gain: 0.2 }],
  bump: [{ freq: 110, to: 70, dur: 0.08, wave: 'square', gain: 0.25 }],
  stair: [{ freq: 330, to: 880, dur: 0.3 }],
  clue: [
    { freq: 660, dur: 0.08 },
    { freq: 990, at: 0.08, dur: 0.14 },
  ],
  pickup: [
    { freq: 523, dur: 0.07, wave: 'square', gain: 0.25 },
    { freq: 784, at: 0.07, dur: 0.07, wave: 'square', gain: 0.25 },
    { freq: 1047, at: 0.14, dur: 0.12, wave: 'square', gain: 0.25 },
  ],
  heal: [{ freq: 392, to: 784, dur: 0.4 }],
  latch: [
    { freq: 180, dur: 0.05, wave: 'square', gain: 0.3 },
    { freq: 260, at: 0.07, dur: 0.06, wave: 'square', gain: 0.3 },
  ],
  encounter: [
    { freq: 196, dur: 0.12, wave: 'sawtooth', gain: 0.25 },
    { freq: 185, at: 0.12, dur: 0.2, wave: 'sawtooth', gain: 0.25 },
  ],
  hit: [{ freq: 300, to: 60, dur: 0.12, wave: 'square', gain: 0.35 }],
  win: [
    { freq: 523, dur: 0.1, wave: 'square', gain: 0.25 },
    { freq: 659, at: 0.1, dur: 0.1, wave: 'square', gain: 0.25 },
    { freq: 784, at: 0.2, dur: 0.25, wave: 'square', gain: 0.25 },
  ],
  lose: [{ freq: 220, to: 110, dur: 0.35, wave: 'sawtooth', gain: 0.25 }],
  buy: [
    { freq: 1319, dur: 0.06, wave: 'square', gain: 0.2 },
    { freq: 1760, at: 0.06, dur: 0.14, wave: 'square', gain: 0.2 },
  ],
  deny: [
    { freq: 150, dur: 0.1, wave: 'square', gain: 0.25 },
    { freq: 150, at: 0.14, dur: 0.1, wave: 'square', gain: 0.25 },
  ],
  dialogue: [
    { freq: 440, dur: 0.05, wave: 'triangle' },
    { freq: 554, at: 0.06, dur: 0.05, wave: 'triangle' },
  ],
  confirm: [{ freq: 880, dur: 0.06, wave: 'triangle' }],
  cancel: [{ freq: 440, to: 330, dur: 0.08, wave: 'triangle' }],
  locked: [{ freq: 98, dur: 0.25, wave: 'sawtooth', gain: 0.25 }],
};

const MUTE_KEY = 'eridanus.muted';
const MASTER_GAIN = 0.4;
// Gap between cues played for one event (an enemy's hit, then the win).
const CUE_GAP = 0.15;

export class Sfx {
  // Created on the first cue, inside a key or click handler, so the
  // browser's autoplay policy lets it run.
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  // Decoded recordings. Loading starts with the context; until a cue's file
  // is ready (or if it never loads) the cue plays its synth placeholder, so
  // playback never waits and cues always sound in the order asked.
  private readonly buffers = new Map<SfxCue, AudioBuffer>();
  private mutedFlag: boolean;

  constructor(
    private readonly storage: Storage,
    private readonly files: ReadonlySet<SfxCue> = SFX_FILES,
  ) {
    try {
      this.mutedFlag = storage.getItem(MUTE_KEY) === '1';
    } catch {
      this.mutedFlag = false;
    }
  }

  get muted(): boolean {
    return this.mutedFlag;
  }

  toggleMuted(): void {
    this.mutedFlag = !this.mutedFlag;
    try {
      if (this.mutedFlag) this.storage.setItem(MUTE_KEY, '1');
      else this.storage.removeItem(MUTE_KEY);
    } catch {
      // Unsaved preference: the toggle still applies for this visit.
    }
    // Cues already scheduled (a win's later notes) fall silent too.
    if (this.master) this.master.gain.value = this.mutedFlag ? 0 : MASTER_GAIN;
    if (!this.mutedFlag) this.play(['confirm']);
  }

  play(cues: readonly SfxCue[]): void {
    if (this.mutedFlag || cues.length === 0) return;
    let audio: { context: AudioContext; master: GainNode };
    try {
      audio = this.ensureContext();
    } catch {
      // No audio in this browser (or its context limit is hit): play on silently.
      return;
    }
    const { context, master } = audio;
    if (context.state === 'suspended') void context.resume();
    cues.forEach((cue, index) => {
      const start = context.currentTime + index * CUE_GAP;
      const buffer = this.buffers.get(cue);
      if (!buffer) return playSynth(context, master, SYNTH[cue], start);
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(master);
      source.start(start);
    });
  }

  private ensureContext(): { context: AudioContext; master: GainNode } {
    if (!this.context || !this.master) {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = MASTER_GAIN;
      this.master.connect(this.context.destination);
      this.preload(this.context);
    }
    return { context: this.context, master: this.master };
  }

  // A missing or undecodable file keeps its synth placeholder.
  private preload(context: AudioContext): void {
    for (const cue of this.files) {
      void fetch(`assets/sfx/${cue}.wav`)
        .then((response) => (response.ok ? response.arrayBuffer() : null))
        .then((data) => (data ? context.decodeAudioData(data) : null))
        .then((buffer) => buffer && this.buffers.set(cue, buffer))
        .catch(() => undefined);
    }
  }
}

function playSynth(
  context: AudioContext,
  master: GainNode,
  tones: readonly Tone[],
  start: number,
): void {
  for (const tone of tones) {
    const t = start + (tone.at ?? 0);
    const end = t + tone.dur;
    const osc = context.createOscillator();
    const env = context.createGain();
    osc.type = tone.wave ?? 'sine';
    osc.frequency.setValueAtTime(tone.freq, t);
    if (tone.to) osc.frequency.exponentialRampToValueAtTime(tone.to, end);
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(tone.gain ?? 0.4, t + 0.005);
    env.gain.exponentialRampToValueAtTime(0.0001, end);
    osc.connect(env).connect(master);
    osc.start(t);
    osc.stop(end + 0.02);
  }
}
