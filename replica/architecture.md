# Architecture: Japanese audio-lesson app (a rebuild of Pimsleur's core features)

Working name only; `/replica-brand` picks the real one.

## Stack

Same stack as the user's other app (Betting Friend), so nothing new to learn.

| layer | choice | why |
| --- | --- | --- |
| web | Next.js (App Router) + TypeScript, installable PWA | user already ships this; static export is enough for v1 |
| styling | Tailwind, tokens from replica-design | same as Betting Friend |
| content | lesson scripts as JSON in the repo (`content/ja/level1/*.json`) | lessons are content, not user data; versioned with the code, reviewed in PRs |
| lesson engine | pure TypeScript: script -> timeline compiler, unit tested | the method lives here; framework-free like Betting Friend's rule engine |
| audio (v1) | browser text-to-speech (`speechSynthesis`, `ja-JP` + `en-US`) | free, no key, works today |
| audio (v1.1) | pre-rendered MP3 per lesson from a cloud TTS, via a build script with the user's own key | consistent voices on every device, and plays with the screen locked |
| progress | `localStorage` (local-first) | no sign-up needed to start lesson 1; mirrors Betting Friend |
| database (later) | Supabase Postgres + Auth + RLS | only when cross-device sync or payments are added |
| payments (later) | Stripe Checkout | only if selling |
| hosting | Vercel | same as Betting Friend (see its docs/DEPLOY.md) |

No server, no database, no API keys for the v1 vertical slice.

## Lesson format and the engine

A lesson is a script of **steps**. The compiler expands it into a flat
**timeline** of segments the player walks through.

```jsonc
// content/ja/level1/01.json
{
  "id": "ja-1-01",
  "level": 1, "number": 1,
  "title": "Excuse me, do you understand English?",
  "items": [
    { "id": "sumimasen", "ja": "すみません", "romaji": "sumimasen", "en": "excuse me",
      "chunks": ["sen", "masen", "sumimasen"] }      // back-chained build-up
  ],
  "steps": [
    { "type": "dialogue", "lines": [ { "speaker": "A", "ja": "すみません。" } ] },
    { "type": "narrate", "en": "Listen to how to say 'excuse me'." },
    { "type": "introduce", "item": "sumimasen" },   // model, build-up, repeat
    { "type": "prompt", "item": "sumimasen", "cue": "How do you say 'excuse me'?" }
  ]
}
```

Segment kinds the compiler emits: `narration (en)`, `model (ja)`,
`pause (seconds)`, `answer (ja)`, `dialogue (ja)`.

**Anticipation:** every `prompt` becomes `narration(cue) -> pause -> answer -> pause(repeat)`.
Pause length scales with the answer length (about 1.5 s + 0.12 s per mora).

**Graduated interval recall:** after an item is introduced, the compiler
schedules automatic re-prompts at growing gaps measured in timeline seconds
(about 10 s, 30 s, 2 min, 6 min, 15 min), slotting them in between authored
steps. Items from earlier lessons (`review` list) are re-prompted early in
the next lesson. Authors write the teaching; the compiler does the spacing.

Both rules are unit tested (`npm run test:engine`), like Betting Friend's.

## Schema

v1 stores progress in `localStorage` under one versioned key:

```ts
type Store = {
  v: 1
  lessons: Record<string, { positionS: number; completedAt?: string; plays: number }>
  items:   Record<string, { due: string; interval: number; ease: number; reps: number }>  // practice SRS
  stats:   { streakDays: number; lastStudyDate?: string; minutes: number }
  prefs:   { rate: number; showText: boolean; pauseScale: number }
}
```

When sync is added, the same shapes move to Supabase. Tables: 3.
Access rules: Postgres RLS, owner-only. See `replica/schema.sql`.

## API

v1 has no server routes: content is static JSON, progress is local.

| route (page) | does | who | flow |
| --- | --- | --- | --- |
| `/` | Home: next-up card (new or resume), level progress | anyone | F01, F02 |
| `/lessons` | Level 1 lesson list, states | anyone | F07 |
| `/lesson/[id]` | Audio lesson player | anyone | F01, F02 |
| `/lesson/[id]/done` | Lesson complete, next / practice | anyone | F01 |
| `/reading` + `/reading/[id]` | Kana reading lessons with audio | anyone | F04 |
| `/practice` | Pick lesson + mode | anyone | F03 |
| `/practice/[id]/cards` | Flash cards | anyone | F03 |
| `/practice/[id]/match` | Multiple-choice match | anyone | F03 |
| `/progress` | Stats, streak | anyone | - |
| `/settings` | Speed, pause length, show text, reset | anyone | - |

Later (with Supabase): `GET/PUT /api/progress` (sync, last-write-wins per
lesson by `updated_at`), Stripe Checkout + webhook (idempotent on event id).

Jobs: none in v1. v1.1 adds `npm run render:audio` (local build step, not a
cron) that turns each compiled timeline into one MP3 + a JSON cue sheet.

## The parts that bite

- **Locked screen / background:** `speechSynthesis` stops when a phone locks
  the screen; an `<audio>` element does not. So v1 (TTS live) needs the
  screen on, which we say in the UI and keep awake with the Wake Lock API.
  v1.1 pre-rendered MP3 + Media Session API fixes it properly.
- **Japanese voice availability:** some devices have no `ja-JP` voice
  (many Android/Linux browsers). Detect it, show how to install one, and
  fall back to romaji on screen.
- **Resume accuracy:** save position as segment index (not seconds) in TTS
  mode, so resume is exact regardless of speaking rate.
- **Interruptions:** pause on `visibilitychange`/audio focus loss; never
  auto-skip a prompt.
- **Content quality:** Japanese lines need a native-speaker check before
  anyone pays for this. Mark lessons `reviewed: false` until then.
- **Offline:** service worker precaches app shell + lesson JSON (+ MP3 in v1.1).
- **Timezones:** streak uses the device's local date.

## Build order

1. **Vertical slice:** engine (compiler + tests), lesson 1 content, player
   with TTS (play/pause/skip, resume), home with next-up card, completion.
   Screens S03, S05, S06. Flows F01, F02.
2. **Must-haves:** lessons 2-5, lesson list states (S04), review of earlier
   items across lessons, wake lock + background guidance, ja voice detection.
3. **Should-haves:** speed + pause length, reading lessons (S07), flash cards
   (S09), match quiz (S10), progress + streak (S13), PWA install + offline.
4. **Could-haves:** pre-rendered audio, dialogue role-play, pronunciation
   check, drive mode, reminders, sync, payments.
5. **Fixes from replica-entrepreneur:** price, boredom, no kana/kanji, thin
   grammar (e.g. optional on-screen text and short grammar notes per lesson).
