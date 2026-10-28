"use client";
import Link from "next/link";
import { Check, Flame, Play, RotateCcw, Settings, Clock } from "lucide-react";
import clsx from "clsx";
import { LESSONS, getCompiled } from "@/lib/content";
import { APP_NAME } from "@/lib/brand";
import { currentStreak, useHydrated, useStore } from "@/lib/progress";
import { minutes } from "@/lib/format";
import { VoiceBanner } from "@/components/voice-banner";

export default function Home() {
  const store = useStore();
  const hydrated = useHydrated();

  const next = LESSONS.find((l) => !store.lessons[l.id]?.completedAt);
  const allDone = !next;
  const upNext = next ?? LESSONS[LESSONS.length - 1];
  const compiled = getCompiled(upNext.id)!;
  const state = store.lessons[upNext.id];
  const resumeAt = !allDone && state?.position ? compiled.segments[state.position]?.t ?? 0 : 0;
  const leftS = compiled.durationS - resumeAt;
  const doneCount = LESSONS.filter((l) => store.lessons[l.id]?.completedAt).length;
  const streak = currentStreak(store);

  return (
    <main className={clsx("flex flex-1 flex-col gap-6", !hydrated && "invisible")}>
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted">Japanese · Level 1</p>
          <h1 className="text-xl font-bold">{APP_NAME}</h1>
        </div>
        <Link href="/settings" aria-label="Settings" className="rounded-md p-2 text-muted hover:text-text">
          <Settings className="h-5 w-5" />
        </Link>
      </header>

      <VoiceBanner />

      <section aria-labelledby="up-next" className="rounded-lg bg-surface p-5">
        <p id="up-next" className="text-xs font-medium uppercase tracking-wider text-accent">
          {allDone ? "All lessons done" : resumeAt > 0 ? "Continue" : "Up next"}
        </p>
        <h2 className="mt-2 text-lg font-semibold">
          Lesson {upNext.number}: {upNext.title}
        </h2>
        <p className="mt-1 text-sm text-muted">{upNext.summary}</p>
        {resumeAt > 0 && (
          <div
            className="mt-4 h-1.5 overflow-hidden rounded-full bg-elevated"
            role="progressbar"
            aria-valuenow={Math.round((resumeAt / compiled.durationS) * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Lesson progress"
          >
            <div className="h-full bg-accent" style={{ width: `${(resumeAt / compiled.durationS) * 100}%` }} />
          </div>
        )}
        <Link
          href={`/lesson/${upNext.id}`}
          className="mt-5 flex h-12 items-center justify-center gap-2 rounded-md bg-accent font-semibold text-on-accent active:opacity-90"
        >
          {allDone ? <RotateCcw className="h-5 w-5" /> : <Play className="h-5 w-5 fill-current" />}
          {allDone ? "Replay last lesson" : resumeAt > 0 ? `Resume · ${minutes(leftS)} left` : `Start · ${minutes(leftS)}`}
        </Link>
        <p className="mt-3 text-center text-xs text-muted">Headphones on. Answer out loud in the pauses.</p>
      </section>

      <section className="grid grid-cols-3 gap-3 text-center">
        <Stat icon={<Flame className="h-4 w-4" />} value={String(streak)} label="day streak" />
        <Stat icon={<Check className="h-4 w-4" />} value={`${doneCount}/${LESSONS.length}`} label="lessons" />
        <Stat icon={<Clock className="h-4 w-4" />} value={String(Math.floor(store.stats.seconds / 60))} label="minutes" />
      </section>

      <section aria-labelledby="all-lessons">
        <h2 id="all-lessons" className="mb-2 text-sm font-semibold text-muted">
          Level 1 lessons
        </h2>
        <ul className="divide-y divide-border overflow-hidden rounded-lg bg-surface">
          {LESSONS.map((l) => {
            const st = store.lessons[l.id];
            const done = !!st?.completedAt;
            const current = l.id === next?.id;
            return (
              <li key={l.id}>
                <Link href={`/lesson/${l.id}`} className="flex items-center gap-3 p-4 active:bg-elevated">
                  <span
                    className={clsx(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                      done ? "bg-success/15 text-success" : current ? "bg-accent text-on-accent" : "bg-elevated text-muted",
                    )}
                    aria-hidden
                  >
                    {done ? <Check className="h-4 w-4" /> : l.number}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{l.title}</span>
                    <span className="block text-xs text-muted">
                      {minutes(getCompiled(l.id)!.durationS)}
                      {done ? " · Done" : current && st?.position ? " · In progress" : current ? " · Up next" : ""}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-center text-xs text-muted">More lessons are on the way.</p>
      </section>
    </main>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="rounded-md bg-surface px-2 py-3">
      <div className="flex items-center justify-center gap-1 text-accent">{icon}</div>
      <div className="mt-1 text-lg font-bold tabular-nums">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}
