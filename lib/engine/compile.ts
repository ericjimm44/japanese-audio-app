/**
 * Lesson compiler: authored steps -> timed segments.
 *
 * Two rules of the method live here:
 *  - Anticipation: every prompt is cue -> silence for the learner to answer
 *    -> the native answer -> a short silence to repeat it.
 *  - Graduated interval recall: once an item is introduced, the compiler
 *    re-prompts it at growing gaps (RECALL_INTERVALS_S) between authored
 *    steps, so authors write the teaching and the spacing takes care of itself.
 */
import type { CompiledLesson, Item, Lesson, Segment } from "./types.ts";

/** Gap before each successive recall of an item, in lesson seconds. */
export const RECALL_INTERVALS_S = [12, 35, 100, 260, 600];
/** Every item reaches at least this many recalls before the lesson ends. */
export const MIN_RECALLS = 3;
/** Items carried over from earlier lessons start at this recall level. */
const REVIEW_START_LEVEL = 2;

const SMALL_KANA = new Set("ゃゅょぁぃぅぇぉャュョァィゥェォ");

/** Approximate morae in a kana string (small ya/yu/yo merge with the previous kana). */
export function moraCount(ja: string): number {
  let n = 0;
  for (const ch of ja) {
    if (SMALL_KANA.has(ch)) continue;
    if (/[぀-ヿ]/.test(ch)) n++;
    else if (/[一-龯]/.test(ch)) n += 2; // kanji: rough average
  }
  return Math.max(n, 1);
}

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const round1 = (x: number) => Math.round(x * 10) / 10;

export function speakDuration(lang: "en" | "ja", text: string): number {
  if (lang === "ja") return round1(0.4 + moraCount(text) / 6.5);
  const words = text.trim().split(/\s+/).length;
  return round1(0.4 + words / 2.6);
}

/** Silence while the learner produces the answer. Longer for longer answers. */
export function anticipatePause(ja: string): number {
  return round1(clamp(1.8 + 0.16 * moraCount(ja), 2.5, 6.5));
}

/** Silence to repeat after hearing the model. */
export function repeatPause(ja: string): number {
  return round1(clamp(1 + 0.12 * moraCount(ja), 2, 5));
}

const AUTHOR_CUES = [
  (en: string) => `How do you say "${en}"?`,
  (en: string) => `Say "${en}".`,
  (en: string) => `What's "${en}" in Japanese?`,
];
const RECALL_CUES = [
  (en: string) => `Do you remember how to say "${en}"?`,
  (en: string) => `How do you say "${en}"?`,
  (en: string) => `Say "${en}" again.`,
  (en: string) => `And "${en}"?`,
];

type Pending = { itemId: string; level: number; dueT: number };

export function compileLesson(
  lesson: Lesson,
  itemIndex: Map<string, Item>,
): CompiledLesson {
  const items = new Map(itemIndex);
  for (const it of lesson.items) items.set(it.id, it);

  const segments: Segment[] = [];
  let t = 0;
  let cueN = 0;
  let recallN = 0;
  let lastPromptedItem: string | undefined;
  const pending = new Map<string, Pending>();

  const getItem = (id: string): Item => {
    const it = items.get(id);
    if (!it) throw new Error(`${lesson.id}: unknown item "${id}"`);
    return it;
  };

  const push = (s: Omit<Segment, "t" | "durS">) => {
    const durS =
      s.kind === "pause" ? s.pauseS ?? 1 : speakDuration(s.lang ?? "en", s.text ?? "");
    segments.push({ ...s, t: round1(t), durS });
    t += durS;
  };

  const promptBlock = (item: Item, cue: string, scheduled: boolean) => {
    const tag = scheduled ? { scheduled: true } : {};
    push({ kind: "narration", lang: "en", text: cue, itemId: item.id, ...tag });
    push({ kind: "pause", pauseS: anticipatePause(item.ja), pauseFor: "anticipate", itemId: item.id, ...tag });
    push({ kind: "answer", lang: "ja", text: item.ja, romaji: item.romaji, en: item.en, itemId: item.id, ...tag });
    push({ kind: "pause", pauseS: repeatPause(item.ja), pauseFor: "repeat", itemId: item.id, ...tag });
    lastPromptedItem = item.id;
  };

  /** Advance an item one recall level and schedule its next recall. */
  const bump = (itemId: string) => {
    const p = pending.get(itemId);
    if (!p) return;
    p.level += 1;
    if (p.level >= RECALL_INTERVALS_S.length) pending.delete(itemId);
    else p.dueT = t + RECALL_INTERVALS_S[p.level];
  };

  const recall = (p: Pending) => {
    const item = getItem(p.itemId);
    promptBlock(item, RECALL_CUES[recallN++ % RECALL_CUES.length](item.en), true);
    bump(p.itemId);
  };

  /**
   * Emit every recall that has come due, earliest first. The same item is
   * never prompted twice back to back; other material in between resets that.
   * `skipId` is the item the next authored step prompts anyway.
   */
  const flushDue = (skipId?: string) => {
    for (;;) {
      const due = [...pending.values()]
        .filter((p) => p.dueT <= t && p.itemId !== lastPromptedItem && p.itemId !== skipId)
        .sort((a, b) => a.dueT - b.dueT);
      if (!due.length) return;
      recall(due[0]);
    }
  };

  /** Recap: keep recalling until every pending item has reached MIN_RECALLS. */
  const flushAll = () => {
    for (;;) {
      const open = [...pending.values()]
        .filter((p) => p.level < MIN_RECALLS)
        .sort((a, b) => a.dueT - b.dueT);
      if (!open.length) return;
      const pick = open.find((p) => p.itemId !== lastPromptedItem) ?? open[0];
      recall(pick);
    }
  };

  (lesson.review ?? []).forEach((id, i) => {
    getItem(id);
    pending.set(id, { itemId: id, level: REVIEW_START_LEVEL, dueT: 20 + 25 * i });
  });

  const hasRecap = lesson.steps.some((s) => s.type === "recap");

  for (const step of lesson.steps) {
    // An authored prompt for an item already counts as its recall.
    flushDue(step.type === "prompt" ? step.item : undefined);
    switch (step.type) {
      case "dialogue":
        for (const line of step.lines) {
          push({ kind: "dialogue", lang: "ja", text: line.ja, en: line.en, speaker: line.speaker });
        }
        push({ kind: "pause", pauseS: 1 });
        lastPromptedItem = undefined;
        break;
      case "narrate":
        push({ kind: "narration", lang: "en", text: step.en });
        lastPromptedItem = undefined;
        break;
      case "listen":
        push({ kind: "model", lang: "ja", text: step.ja, en: step.en });
        lastPromptedItem = undefined;
        break;
      case "introduce": {
        const item = getItem(step.item);
        push({ kind: "narration", lang: "en", text: step.note ?? `Here's how to say "${item.en}".`, itemId: item.id });
        push({ kind: "model", lang: "ja", text: item.ja, romaji: item.romaji, en: item.en, itemId: item.id });
        if (item.chunks?.length) {
          push({ kind: "narration", lang: "en", text: "Repeat after the speaker, starting from the end." });
          for (const c of item.chunks) {
            push({ kind: "model", lang: "ja", text: c, itemId: item.id });
            push({ kind: "pause", pauseS: repeatPause(c), pauseFor: "repeat", itemId: item.id });
          }
          push({ kind: "narration", lang: "en", text: "Now the whole thing." });
        } else {
          push({ kind: "narration", lang: "en", text: "Listen and repeat." });
        }
        push({ kind: "model", lang: "ja", text: item.ja, romaji: item.romaji, en: item.en, itemId: item.id });
        push({ kind: "pause", pauseS: repeatPause(item.ja), pauseFor: "repeat", itemId: item.id });
        lastPromptedItem = item.id;
        pending.set(item.id, { itemId: item.id, level: 0, dueT: t + RECALL_INTERVALS_S[0] });
        break;
      }
      case "prompt": {
        const item = getItem(step.item);
        promptBlock(item, step.cue ?? AUTHOR_CUES[cueN++ % AUTHOR_CUES.length](item.en), false);
        bump(item.id);
        break;
      }
      case "recap":
        push({ kind: "narration", lang: "en", text: "Let's review everything from today." });
        flushAll();
        break;
      default:
        throw new Error(`${lesson.id}: unknown step type "${(step as { type: string }).type}"`);
    }
  }
  if (!hasRecap) flushAll();

  return { lesson, segments, durationS: round1(t) };
}

/** Index of the segment that is playing at time tS (for scrubbing). */
export function segmentAt(segments: Segment[], tS: number): number {
  let lo = 0;
  let hi = segments.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (segments[mid].t <= tS) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

const isBlockStart = (s: Segment) => s.kind === "narration" || s.kind === "dialogue";

/** Start of the block (cue, introduction, or dialogue line) that contains `index`. */
export function blockStartAt(segments: Segment[], index: number): number {
  let i = Math.min(Math.max(0, index), segments.length - 1);
  while (i > 0 && !isBlockStart(segments[i])) i--;
  return i;
}

/**
 * Where "skip back" should land: the start of the block containing `index`
 * (its cue narration), or the previous block if we're already at its start.
 */
export function previousBlockStart(segments: Segment[], index: number): number {
  const start = blockStartAt(segments, index);
  return start === index && start > 0 ? blockStartAt(segments, start - 1) : start;
}

/** Where "skip forward" should land: the next block start. */
export function nextBlockStart(segments: Segment[], index: number): number {
  for (let i = index + 1; i < segments.length; i++) {
    if (isBlockStart(segments[i])) return i;
  }
  return segments.length;
}
