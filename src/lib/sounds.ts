/**
 * Premium sound effects using the Web Audio API — no external files needed.
 * Generates pleasant tones for habit completions, streaks, and level-ups.
 * Respects the user's sound setting (checked by the caller).
 */

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext)();
    } catch {
      return null;
    }
  }
  // resume if suspended (autoplay policy)
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

interface ToneOptions {
  frequency: number;
  duration: number;
  type?: OscillatorType;
  volume?: number;
  delay?: number;
}

function playTone({
  frequency,
  duration,
  type = "sine",
  volume = 0.15,
  delay = 0,
}: ToneOptions) {
  const ctx = getCtx();
  if (!ctx) return;

  const startTime = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.value = frequency;

  // envelope: quick attack, gentle decay
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(volume, startTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration);
}

/** Pleasant completion sound — a rising two-note chime. */
export function playCompletionSound() {
  playTone({ frequency: 523.25, duration: 0.15, type: "sine", volume: 0.12 });
  playTone({
    frequency: 783.99,
    duration: 0.25,
    type: "sine",
    volume: 0.10,
    delay: 0.08,
  });
}

/** Streak milestone sound — a triumphant three-note arpeggio. */
export function playStreakSound() {
  playTone({ frequency: 523.25, duration: 0.12, type: "triangle", volume: 0.12 });
  playTone({
    frequency: 659.25,
    duration: 0.12,
    type: "triangle",
    volume: 0.12,
    delay: 0.1,
  });
  playTone({
    frequency: 783.99,
    duration: 0.3,
    type: "triangle",
    volume: 0.14,
    delay: 0.2,
  });
}

/** Level-up sound — a celebratory four-note fanfare. */
export function playLevelUpSound() {
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((freq, i) => {
    playTone({
      frequency: freq,
      duration: i === notes.length - 1 ? 0.4 : 0.15,
      type: "sine",
      volume: 0.13,
      delay: i * 0.1,
    });
  });
}

/** Perfect day sound — a warm chord. */
export function playPerfectDaySound() {
  [523.25, 659.25, 783.99].forEach((freq) => {
    playTone({
      frequency: freq,
      duration: 0.6,
      type: "sine",
      volume: 0.08,
      delay: 0,
    });
  });
}
