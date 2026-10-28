"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, Pause, Play, RotateCcw, SkipBack, SkipForward } from "lucide-react";
import clsx from "clsx";
import { LESSONS, getCompiled } from "@/lib/content";
import { blockStartAt, nextBlockStart, previousBlockStart, segmentAt } from "@/lib/engine/compile";
import type { Segment } from "@/lib/engine/types";
import { TtsLessonPlayer, voicesReady } from "@/lib/player/tts-player";
import {
  addStudySeconds,
  completeLesson,
  savePosition,
  useHydrated,
  useStore,
} from "@/lib/progress";
import { clock } from "@/lib/format";
import { VoiceBanner } from "./voice-banner";

export function Player({ lessonId }: { lessonId: string }) {
  const compiled = getCompiled(lessonId)!;
  const { lesson, segments, durationS } = compiled;
  const store = useStore();
  const hydrated = useHydrated();
  const { prefs } = store;

  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  // False until the saved position is restored, so we never overwrite it with 0.
  const [restored, setRestored] = useState(false);
  const playerRef = useRef<TtsLessonPlayer | null>(null);

  // Restore the saved position once, at the start of its block so the cue is heard again.
  useEffect(() => {
    if (!hydrated || restored) return;
    const saved = store.lessons[lessonId];
    if (saved && !saved.completedAt && saved.position > 0) setIndex(blockStartAt(segments, saved.position));
    setRestored(true);
  }, [hydrated, restored, store.lessons, lessonId, segments]);

  useEffect(() => {
    if (restored && !ended) savePosition(lessonId, index);
  }, [restored, index, lessonId, ended]);

  const getPlayer = useCallback(() => {
    if (!playerRef.current) {
      playerRef.current = new TtsLessonPlayer(
        segments,
        {
          rate: prefs.rate,
          pauseScale: prefs.pauseScale,
          onIndex: setIndex,
          onPlaying: setPlaying,
          onEnded: () => {
            completeLesson(lessonId);
            setEnded(true);
          },
        },
        index,
      );
    }
    return playerRef.current;
  }, [segments, prefs.rate, prefs.pauseScale, lessonId, index]);

  useEffect(() => {
    playerRef.current?.setOptions({ rate: prefs.rate, pauseScale: prefs.pauseScale });
  }, [prefs.rate, prefs.pauseScale]);

  useEffect(() => () => playerRef.current?.destroy(), []);

  const toggle = useCallback(async () => {
    await voicesReady();
    getPlayer().toggle();
  }, [getPlayer]);

  const seek = useCallback(
    (i: number) => {
      const clamped = Math.min(Math.max(0, i), segments.length - 1);
      if (playerRef.current) playerRef.current.seek(clamped);
      else setIndex(clamped);
    },
    [segments.length],
  );

  const replay = () => {
    playerRef.current?.destroy();
    playerRef.current = null;
    setEnded(false);
    setIndex(0);
  };

  useStudyClock(playing);
  useWakeLock(playing);

  // Speech stops when the page is hidden on most phones, so pause cleanly instead.
  useEffect(() => {
    const onHide = () => document.hidden && playerRef.current?.pause();
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, []);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: `Lesson ${lesson.number}: ${lesson.title}`,
      artist: "Japanese · Level 1",
    });
    navigator.mediaSession.setActionHandler("play", () => getPlayer().play());
    navigator.mediaSession.setActionHandler("pause", () => playerRef.current?.pause());
    navigator.mediaSession.setActionHandler("previoustrack", () => seek(previousBlockStart(segments, index)));
    navigator.mediaSession.setActionHandler("nexttrack", () => seek(nextBlockStart(segments, index)));
  }, [lesson, getPlayer, seek, segments, index]);

  const seg = segments[Math.min(index, segments.length - 1)];
  const nextLesson = LESSONS.find((l) => l.level === lesson.level && l.number === lesson.number + 1);

  if (ended) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-success/15 text-success">
          <Check className="h-8 w-8" />
        </span>
        <div>
          <h1 className="text-xl font-bold">Lesson {lesson.number} complete</h1>
          <p className="mt-2 text-muted">{lesson.summary}</p>
        </div>
        <div className="flex w-full flex-col gap-3">
          {nextLesson ? (
            <Link
              href={`/lesson/${nextLesson.id}`}
              className="flex h-12 items-center justify-center rounded-md bg-accent font-semibold text-on-accent"
            >
              Next: Lesson {nextLesson.number}
            </Link>
          ) : (
            <p className="rounded-md bg-surface p-3 text-sm text-muted">
              That's every lesson so far. Replay this one tomorrow; spacing it out helps it stick.
            </p>
          )}
          <button onClick={replay} className="flex h-12 items-center justify-center gap-2 rounded-md bg-surface font-medium">
            <RotateCcw className="h-4 w-4" /> Replay
          </button>
          <Link href="/" className="flex h-12 items-center justify-center rounded-md font-medium text-muted">
            Home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-5">
      <header className="flex items-center gap-2">
        <Link href="/" aria-label="Back to home" className="-ml-2 rounded-md p-2 text-muted hover:text-text">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">
            Level {lesson.level} · Lesson {lesson.number}
          </p>
          <h1 className="truncate font-semibold">{lesson.title}</h1>
        </div>
      </header>

      <VoiceBanner />

      <SegmentView segments={segments} index={index} showText={prefs.showText} started={playing || index > 0} />

      <div className="space-y-2">
        <input
          type="range"
          min={0}
          max={Math.ceil(durationS)}
          step={1}
          value={Math.floor(seg.t)}
          onChange={(e) => seek(segmentAt(segments, Number(e.target.value)))}
          aria-label="Lesson position"
          aria-valuetext={`${clock(seg.t)} of ${clock(durationS)}`}
          className="w-full accent-[rgb(var(--accent))]"
        />
        <div className="flex justify-between text-xs tabular-nums text-muted">
          <span>{clock(seg.t)}</span>
          <span>-{clock(durationS - seg.t)}</span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-8 pb-4">
        <button
          onClick={() => seek(previousBlockStart(segments, index))}
          aria-label="Back to previous phrase"
          className="rounded-full p-3 text-muted hover:text-text"
        >
          <SkipBack className="h-7 w-7" />
        </button>
        <button
          onClick={toggle}
          aria-label={playing ? "Pause" : "Play"}
          className="flex h-20 w-20 items-center justify-center rounded-full bg-accent text-on-accent shadow-lg active:scale-95"
        >
          {playing ? <Pause className="h-9 w-9 fill-current" /> : <Play className="ml-1 h-9 w-9 fill-current" />}
        </button>
        <button
          onClick={() => seek(nextBlockStart(segments, index))}
          aria-label="Skip to next phrase"
          className="rounded-full p-3 text-muted hover:text-text"
        >
          <SkipForward className="h-7 w-7" />
        </button>
      </div>
      {!lesson.reviewed && (
        <p className="text-center text-xs text-muted">Draft lesson: Japanese not yet checked by a native speaker.</p>
      )}
    </main>
  );
}

/** What's happening now, in big type. The answer stays hidden while it's the learner's turn. */
function SegmentView({
  segments,
  index,
  showText,
  started,
}: {
  segments: Segment[];
  index: number;
  showText: boolean;
  started: boolean;
}) {
  const seg = segments[Math.min(index, segments.length - 1)];
  const lastSpoken = useMemo(() => {
    for (let i = index; i >= 0; i--) if (segments[i].kind !== "pause") return segments[i];
    return seg;
  }, [segments, index, seg]);

  let label = "Listen";
  let shown: Segment | null = seg;
  let yourTurn = false;
  if (seg.kind === "pause" && seg.pauseFor === "anticipate") {
    label = "Your turn: say it out loud";
    yourTurn = true;
    shown = lastSpoken; // the English cue, never the answer
  } else if (seg.kind === "pause" && seg.pauseFor === "repeat") {
    label = "Repeat";
    shown = lastSpoken;
  } else if (seg.kind === "pause") {
    shown = null;
  } else if (seg.kind === "dialogue") {
    label = seg.speaker ?? "Conversation";
  } else if (seg.kind === "answer") {
    label = "Answer";
  }

  if (!started) {
    return (
      <section className="flex flex-1 flex-col items-center justify-center rounded-lg bg-surface p-6 text-center">
        <p className="text-lg font-semibold">Ready when you are</p>
        <p className="mt-2 max-w-xs text-sm text-muted">
          Put your headphones on. When you're asked how to say something, answer out loud in the pause, before you hear
          the answer. Getting it wrong is part of it.
        </p>
      </section>
    );
  }

  return (
    <section
      aria-live="polite"
      className={clsx(
        "flex flex-1 flex-col items-center justify-center rounded-lg p-6 text-center transition-colors",
        yourTurn ? "bg-accent/10 ring-2 ring-accent" : "bg-surface",
      )}
    >
      <p className={clsx("text-xs font-semibold uppercase tracking-wider", yourTurn ? "text-accent" : "text-muted")}>
        {label}
      </p>
      {yourTurn && <span className="mt-4 h-3 w-3 animate-ping rounded-full bg-accent" aria-hidden />}
      {showText && shown && (
        <div className="mt-4 space-y-2">
          {shown.lang === "ja" ? (
            <>
              <p lang="ja" className="font-ja text-4xl font-bold leading-tight">
                {shown.text}
              </p>
              {shown.romaji && <p className="text-lg text-muted">{shown.romaji}</p>}
              {shown.en && <p className="text-sm text-muted">“{shown.en}”</p>}
            </>
          ) : (
            <p className={clsx("leading-relaxed", yourTurn ? "text-xl font-semibold" : "text-base text-muted")}>
              {shown.text}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

/** Counts listening time while playing; flushes to the store every 15 s and on stop. */
function useStudyClock(playing: boolean) {
  useEffect(() => {
    if (!playing) return;
    let pending = 0;
    const tick = setInterval(() => {
      pending++;
      if (pending >= 15) {
        addStudySeconds(pending);
        pending = 0;
      }
    }, 1000);
    return () => {
      clearInterval(tick);
      if (pending) addStudySeconds(pending);
    };
  }, [playing]);
}

/** Keeps the screen on while playing: browser speech stops when the phone locks. */
function useWakeLock(playing: boolean) {
  useEffect(() => {
    if (!playing || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    navigator.wakeLock
      .request("screen")
      .then((l) => {
        if (cancelled) l.release();
        else lock = l;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      lock?.release().catch(() => {});
    };
  }, [playing]);
}
