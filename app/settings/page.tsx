"use client";
import Link from "next/link";
import { ArrowLeft, Volume2 } from "lucide-react";
import clsx from "clsx";
import { resetProgress, setPrefs, useStore } from "@/lib/progress";
import { speakOnce } from "@/lib/player/tts-player";
import { VoiceBanner } from "@/components/voice-banner";

const PAUSES = [
  { value: 1, label: "Normal" },
  { value: 1.5, label: "Longer" },
  { value: 2, label: "Longest" },
];

export default function SettingsPage() {
  const { prefs } = useStore();

  return (
    <main className="flex flex-1 flex-col gap-6">
      <header className="flex items-center gap-2">
        <Link href="/" aria-label="Back to home" className="-ml-2 rounded-md p-2 text-muted hover:text-text">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-semibold">Settings</h1>
      </header>

      <VoiceBanner />

      <section className="space-y-5 rounded-lg bg-surface p-5">
        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="rate" className="font-medium">
              Speaking speed
            </label>
            <span className="text-sm tabular-nums text-muted">{prefs.rate.toFixed(1)}×</span>
          </div>
          <input
            id="rate"
            type="range"
            min={0.7}
            max={1.3}
            step={0.1}
            value={prefs.rate}
            onChange={(e) => setPrefs({ rate: Number(e.target.value) })}
            className="mt-2 w-full accent-[rgb(var(--accent))]"
          />
        </div>

        <fieldset>
          <legend className="font-medium">Time to answer</legend>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {PAUSES.map((p) => (
              <button
                key={p.value}
                onClick={() => setPrefs({ pauseScale: p.value })}
                aria-pressed={prefs.pauseScale === p.value}
                className={clsx(
                  "h-10 rounded-md text-sm font-medium",
                  prefs.pauseScale === p.value ? "bg-accent text-on-accent" : "bg-elevated text-muted",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="flex items-center justify-between gap-4">
          <span>
            <span className="block font-medium">Show text while listening</span>
            <span className="block text-sm text-muted">Off is harder, and closer to real conversation.</span>
          </span>
          <input
            type="checkbox"
            checked={prefs.showText}
            onChange={(e) => setPrefs({ showText: e.target.checked })}
            className="h-5 w-5 shrink-0 accent-[rgb(var(--accent))]"
          />
        </label>
      </section>

      <section className="space-y-3 rounded-lg bg-surface p-5">
        <h2 className="font-medium">Test the voices</h2>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => speakOnce("こんにちは。コーヒー、おねがいします。", "ja", prefs.rate * 0.9)}
            className="flex h-10 items-center justify-center gap-2 rounded-md bg-elevated text-sm"
          >
            <Volume2 className="h-4 w-4" /> Japanese
          </button>
          <button
            onClick={() => speakOnce("How do you say hello?", "en", prefs.rate)}
            className="flex h-10 items-center justify-center gap-2 rounded-md bg-elevated text-sm"
          >
            <Volume2 className="h-4 w-4" /> English
          </button>
        </div>
      </section>

      <button
        onClick={() => {
          if (confirm("Reset all lesson progress and your streak? Settings are kept.")) resetProgress();
        }}
        className="h-11 rounded-md text-sm font-medium text-danger"
      >
        Reset progress
      </button>
    </main>
  );
}
