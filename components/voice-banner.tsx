"use client";
import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { voiceStatus, voicesReady, type VoiceStatus } from "@/lib/player/tts-player";

/** Warns when the device can't speak Japanese, and says how to fix it. */
export function VoiceBanner() {
  const [status, setStatus] = useState<VoiceStatus>("ok");

  useEffect(() => {
    let alive = true;
    voicesReady().then(() => alive && setStatus(voiceStatus()));
    return () => {
      alive = false;
    };
  }, []);

  if (status === "ok") return null;

  return (
    <div role="status" className="flex gap-3 rounded-md border border-border bg-surface p-3 text-sm">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
      {status === "no-speech" ? (
        <p className="text-muted">
          This browser can't speak aloud. Lessons will play as text only. Try Chrome or Safari.
        </p>
      ) : (
        <div className="space-y-1 text-muted">
          <p className="text-text">No Japanese voice on this device.</p>
          <p>
            Japanese may be read wrongly until you add one. iPhone: Settings → Accessibility → Spoken Content →
            Voices → Japanese. Android: Settings → Text-to-speech → Google → install Japanese.
          </p>
        </div>
      )}
    </div>
  );
}
