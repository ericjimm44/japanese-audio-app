"use client";
/**
 * Local-first progress, settings and streak, in one versioned localStorage
 * key. Same shapes as replica/schema.sql so sync can be added later.
 */
import { useSyncExternalStore } from "react";

export type LessonState = {
  /** Segment index to resume from. */
  position: number;
  completedAt?: string;
  plays: number;
  updatedAt: string;
};

export type Prefs = {
  /** Speech rate multiplier, 0.7-1.3. */
  rate: number;
  /** Multiplier on answer pauses: more time to think. */
  pauseScale: number;
  /** Show Japanese text and romaji while playing. */
  showText: boolean;
};

export type Store = {
  v: 1;
  lessons: Record<string, LessonState>;
  prefs: Prefs;
  stats: { seconds: number; streakDays: number; lastStudyDate?: string };
};

const KEY = "kikitori:v1";
const EVENT = "kikitori:store";

export const DEFAULT_PREFS: Prefs = { rate: 1, pauseScale: 1, showText: true };

const empty = (): Store => ({
  v: 1,
  lessons: {},
  prefs: { ...DEFAULT_PREFS },
  stats: { seconds: 0, streakDays: 0 },
});

const SERVER_SNAPSHOT = empty();
let cache: Store | null = null;

function read(): Store {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Store) : null;
    cache = parsed?.v === 1 ? { ...empty(), ...parsed, prefs: { ...DEFAULT_PREFS, ...parsed.prefs } } : empty();
  } catch {
    cache = empty();
  }
  return cache;
}

function write(next: Store) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Private mode or storage full: keep working in memory.
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      cb();
    }
  };
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function useStore(): Store {
  return useSyncExternalStore(subscribe, read, () => SERVER_SNAPSHOT);
}

/** True once the client has read localStorage (avoids flashing empty state). */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

const now = () => new Date().toISOString();

function localDate(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function savePosition(lessonId: string, position: number) {
  const s = read();
  const prev = s.lessons[lessonId];
  if (prev?.position === position) return;
  write({
    ...s,
    lessons: { ...s.lessons, [lessonId]: { ...prev, plays: prev?.plays ?? 0, position, updatedAt: now() } },
  });
}

export function completeLesson(lessonId: string) {
  const s = read();
  const prev = s.lessons[lessonId];
  write({
    ...s,
    lessons: {
      ...s.lessons,
      [lessonId]: { position: 0, plays: (prev?.plays ?? 0) + 1, completedAt: now(), updatedAt: now() },
    },
  });
}

export function setPrefs(patch: Partial<Prefs>) {
  const s = read();
  write({ ...s, prefs: { ...s.prefs, ...patch } });
}

/** Add listening time and keep the daily streak (by the device's local date). */
export function addStudySeconds(seconds: number) {
  const s = read();
  const today = localDate();
  let { streakDays, lastStudyDate } = s.stats;
  if (lastStudyDate !== today) {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    streakDays = lastStudyDate === localDate(y) ? streakDays + 1 : 1;
    lastStudyDate = today;
  }
  write({ ...s, stats: { seconds: s.stats.seconds + seconds, streakDays, lastStudyDate } });
}

/** Streak still counts if the learner studied today or yesterday. */
export function currentStreak(s: Store): number {
  const { lastStudyDate, streakDays } = s.stats;
  if (!lastStudyDate) return 0;
  const y = new Date();
  y.setDate(y.getDate() - 1);
  return lastStudyDate === localDate() || lastStudyDate === localDate(y) ? streakDays : 0;
}

export function resetProgress() {
  const s = read();
  write({ ...empty(), prefs: s.prefs });
}
