/**
 * Lesson content types. A lesson is authored as a list of steps; the
 * compiler expands it into a flat timeline of segments the player walks.
 */

export type Lang = "en" | "ja";

/** A word or phrase the learner must be able to say. */
export type Item = {
  id: string;
  /** Japanese as spoken, in kana (kanji only where it reads unambiguously). */
  ja: string;
  romaji: string;
  /** English meaning, used in cues: "How do you say '<en>'?" */
  en: string;
  /**
   * Optional back-chained build-up, shortest tail first, in kana:
   * ["ます", "します", "おねがいします"].
   */
  chunks?: string[];
};

export type DialogueLine = { speaker: string; ja: string; en?: string };

export type Step =
  | { type: "dialogue"; lines: DialogueLine[] }
  | { type: "narrate"; en: string }
  | { type: "introduce"; item: string; note?: string }
  | { type: "prompt"; item: string; cue?: string }
  | { type: "listen"; ja: string; en?: string }
  /** Recall every item until each has reached MIN_RECALLS. Defaults to the end. */
  | { type: "recap" };

export type Lesson = {
  id: string;
  level: number;
  number: number;
  title: string;
  summary: string;
  /** False until a native speaker has checked the Japanese. */
  reviewed: boolean;
  items: Item[];
  /** Item ids from earlier lessons to recall early in this one. */
  review?: string[];
  steps: Step[];
};

export type SegmentKind = "narration" | "model" | "dialogue" | "answer" | "pause";

export type Segment = {
  kind: SegmentKind;
  /** Spoken language. Absent for pauses. */
  lang?: Lang;
  text?: string;
  romaji?: string;
  /** English gloss, shown under Japanese when text is visible. */
  en?: string;
  speaker?: string;
  itemId?: string;
  /** Pause length in seconds (before the user's pause-length setting). */
  pauseS?: number;
  /** "anticipate" = the learner answers now; "repeat" = say it after the model. */
  pauseFor?: "anticipate" | "repeat";
  /** True when the spaced-recall scheduler inserted this, not the author. */
  scheduled?: boolean;
  /** Estimated start time and duration, in seconds. */
  t: number;
  durS: number;
};

export type CompiledLesson = {
  lesson: Lesson;
  segments: Segment[];
  durationS: number;
};
