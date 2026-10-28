/**
 * Plays a compiled lesson with the browser's speech synthesis.
 *
 * Position is a segment index, not seconds, so resume is exact whatever the
 * speaking rate. Every segment has a safety timer: some browsers drop the
 * `end` event, and a lesson must never stall. With no speech synthesis at
 * all, it runs silently on estimated timings so the text still plays through.
 */
import type { Segment } from "../engine/types.ts";

export type VoiceStatus = "ok" | "no-ja-voice" | "no-speech";

export type PlayerOptions = {
  rate: number;
  pauseScale: number;
  onIndex: (index: number) => void;
  onPlaying: (playing: boolean) => void;
  onEnded: () => void;
};

const synth = (): SpeechSynthesis | null =>
  typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null;

export function pickVoice(lang: "en" | "ja"): SpeechSynthesisVoice | undefined {
  const voices = synth()?.getVoices() ?? [];
  const prefix = lang === "ja" ? "ja" : "en";
  const matches = voices.filter((v) => v.lang.toLowerCase().replace("_", "-").startsWith(prefix));
  // Prefer local, then the higher-quality "natural"/"enhanced"/Google voices.
  const score = (v: SpeechSynthesisVoice) =>
    (/natural|enhanced|premium|google|kyoko|otoya/i.test(v.name) ? 2 : 0) +
    (v.localService ? 1 : 0) +
    (lang === "en" && /en-us/i.test(v.lang) ? 1 : 0);
  return matches.sort((a, b) => score(b) - score(a))[0];
}

export function voiceStatus(): VoiceStatus {
  const s = synth();
  if (!s) return "no-speech";
  const voices = s.getVoices();
  // Voices load asynchronously; an empty list may just mean "not yet".
  if (voices.length && !pickVoice("ja")) return "no-ja-voice";
  return "ok";
}

/** Resolves once the browser has loaded its voice list (or after a short wait). */
export function voicesReady(timeoutMs = 1500): Promise<void> {
  const s = synth();
  if (!s || s.getVoices().length) return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      s.removeEventListener("voiceschanged", done);
      resolve();
    };
    s.addEventListener("voiceschanged", done);
    setTimeout(done, timeoutMs);
  });
}

export function speakOnce(text: string, lang: "en" | "ja", rate = 1) {
  const s = synth();
  if (!s) return;
  s.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang === "ja" ? "ja-JP" : "en-US";
  const v = pickVoice(lang);
  if (v) u.voice = v;
  u.rate = rate;
  s.speak(u);
}

export class TtsLessonPlayer {
  private index = 0;
  private playing = false;
  /** Bumped on every pause/seek so callbacks from a cancelled segment are ignored. */
  private token = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private safety: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private segments: Segment[],
    private opts: PlayerOptions,
    start = 0,
  ) {
    this.index = Math.min(Math.max(0, start), segments.length);
  }

  get currentIndex() {
    return this.index;
  }

  get isPlaying() {
    return this.playing;
  }

  setOptions(patch: Partial<Pick<PlayerOptions, "rate" | "pauseScale">>) {
    Object.assign(this.opts, patch);
  }

  play() {
    if (this.playing) return;
    if (this.index >= this.segments.length) this.index = 0;
    this.playing = true;
    this.opts.onPlaying(true);
    this.run(++this.token);
  }

  pause() {
    if (!this.playing) return;
    this.playing = false;
    this.stopCurrent();
    this.opts.onPlaying(false);
  }

  toggle() {
    if (this.playing) this.pause();
    else this.play();
  }

  /** Jump to a segment; keeps playing if it was playing. */
  seek(index: number) {
    this.stopCurrent();
    this.index = Math.min(Math.max(0, index), this.segments.length - 1);
    this.opts.onIndex(this.index);
    if (this.playing) this.run(++this.token);
  }

  destroy() {
    this.playing = false;
    this.stopCurrent();
  }

  private stopCurrent() {
    this.token++;
    clearTimeout(this.timer);
    clearTimeout(this.safety);
    synth()?.cancel();
  }

  private run(token: number) {
    if (token !== this.token || !this.playing) return;
    if (this.index >= this.segments.length) {
      this.playing = false;
      this.opts.onPlaying(false);
      this.opts.onEnded();
      return;
    }
    this.opts.onIndex(this.index);
    const seg = this.segments[this.index];
    const next = () => {
      if (token !== this.token) return;
      clearTimeout(this.timer);
      clearTimeout(this.safety);
      this.index++;
      this.run(token);
    };

    if (seg.kind === "pause") {
      this.timer = setTimeout(next, (seg.pauseS ?? 1) * this.opts.pauseScale * 1000);
      return;
    }

    const lang = seg.lang ?? "en";
    const rate = this.opts.rate * (lang === "ja" ? 0.9 : 1);
    const expectedMs = (seg.durS / rate) * 1000;
    const s = synth();
    if (!s) {
      this.timer = setTimeout(next, expectedMs);
      return;
    }

    const u = new SpeechSynthesisUtterance(seg.text ?? "");
    u.lang = lang === "ja" ? "ja-JP" : "en-US";
    const v = pickVoice(lang);
    if (v) u.voice = v;
    u.rate = rate;
    u.onend = next;
    u.onerror = next;
    // Never stall: if `end` never arrives, move on after a generous wait.
    this.safety = setTimeout(next, expectedMs * 2.5 + 2000);
    s.speak(u);
  }
}
