# Kikitori (working name)

Mobile-first Japanese audio lessons. You hear a prompt, answer **out loud** in
the pause, then hear the answer. Every word comes back at growing gaps
(spaced, graduated recall) so it sticks.

It rebuilds the *method* of audio courses like Pimsleur, clean-room. All
lessons are original and voiced by your device's text-to-speech; no
third-party audio, scripts or branding are used.

## Status: v1 vertical slice

- Lesson engine: authored steps → timed segments, with anticipation pauses and
  automatic spaced recall (`lib/engine`, 13 unit tests)
- Lessons 1–2 of Level 1 (`content/ja/level1`). **Draft**: the Japanese still
  needs a native-speaker check.
- Player: play/pause, phrase skip, scrub, resume where you left off, keeps the
  screen awake, hides the answer while it's your turn
- Home: next-up card, lesson list, streak / lessons / minutes
- Settings: speaking speed, time to answer, show/hide text, voice test
- Progress is stored on the device (no account needed)
- Installable to the home screen (web manifest)

Parity with the feature matrix: 62/100 (`python3 .claude/skills/replica-diff/parity.py replica/features.csv`).

## Run it

```bash
npm install
npm run test:engine   # engine + content checks
npm run dev           # http://localhost:3000
```

On a phone: open the deployed URL, then Share → Add to Home Screen.
If Japanese sounds wrong, the device has no Japanese voice; the app explains
how to add one.

Browser smoke test (needs Playwright and the app running):

```bash
npm run build && npm start &
BASE_URL=http://localhost:3000 node tests/smoke.cjs
```

## Writing a lesson

Lessons are TypeScript files in `content/ja/level1/`, registered in
`lib/content.ts`. Write the teaching; the compiler handles the spacing:

- `introduce` an item (optionally with back-chained `chunks`)
- `prompt` it with your own cue
- list earlier items in `review` to recall them early
- `recap` recalls anything still under-practised

`npm run test:engine` fails if an item is under-practised, an id is
duplicated, or a lesson reviews something it hasn't taught yet.

## Known limits

- Browser speech stops when the phone locks, so lessons keep the screen on.
  Next step: pre-rendered audio files, which also play on the lock screen.
- Lessons are about 5–6 minutes, not 30, until there's more content.

## The plan

See `replica/`: `recon.md` (what the original does), `features.csv` (feature
matrix), `architecture.md` (stack, lesson format, build order), `design/`.
