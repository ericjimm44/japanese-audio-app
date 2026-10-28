# Recon map: Pimsleur Japanese (iOS / Android / web app)

Scope: the core loop — Japanese audio lessons using spaced, prompted recall,
lesson progress, plus a short reading section and a review (practice) area.
Level 1 only, about 5 original lessons for v1.
For: the user's own Japanese study first; possibly a product to sell later.
Platform for the clone: mobile-first web app (installable PWA).
Date: 2026-10-28

Clean-room note: this map describes what the app does and how people move
through it. No Pimsleur audio, scripts, lesson text, logos, or copy are used.
Every lesson in the clone is written fresh and voiced with text-to-speech.

## Sources

Page fetches were blocked by this session's network policy
(apps.apple.com, pimsleur.com, migaku.com did not resolve), so this map is
built from search-result summaries. Confidence is lower than a hands-on
walkthrough; see "Gaps" below.

| # | source | URL | notes |
| --- | --- | --- | --- |
| 1 | App Store listing | https://apps.apple.com/us/app/pimsleur-language-learning-app/id1405735469 | feature list: flash cards, Quick Match, Speak Easy, reading lessons, AI voice/coach |
| 2 | marketing / app page | https://www.pimsleur.com/pimsleur-app/ | built-in player for audio + reading lessons, flash cards, voice recognition, quizzes |
| 3 | blog: premium app updates | https://www.pimsleur.com/blog/pimsleur-premium-app-updates | Practice tab: pick a lesson, choose how many cards/questions; Speed Round |
| 4 | method page | https://www.pimsleur.com/the_pimsleur_method | anticipation, graduated interval recall, core vocabulary, organic learning |
| 5 | Pimsleur 1967 "A Memory Schedule" | https://typeset.io/pdf/a-memory-schedule-1yvfb57hw1.pdf | GIR example intervals ~5s, 25s, 2m, 10m (exponential) |
| 6 | course structure analysis | https://courses.languagereactor.com/david/alc-english/raw/commit/adecabbc4d062182efd4cd12bf79b1138be11d98/pimsleur-study/ANALYSIS.md | cue -> pause -> native confirmation pattern |
| 7 | italki review | https://www.italki.com/en/blog/pimsleur-japanese-review | ~30-min lessons, English narrator, review of earlier vocab each lesson |
| 8 | Migaku review | https://migaku.com/blog/japanese/pimsleur-japanese-review | 5 levels x 30 lessons; clean UI; offline download; drive mode; thin grammar |
| 9 | pricing (3rd party) | https://testprepinsight.com/resources/how-much-does-pimsleur-cost/ | ~$19.95-20.95/mo, ~$165/yr, 7-day trial |
| 10 | complaints | https://unitq.com/unitq-scorecards/pimsleur | price, dry/boring format |

## Core loop

Press play on today's ~30-minute audio lesson, answer each spoken prompt out
loud in the pause before the native speaker says it, and pick up at the next
lesson tomorrow.

## How a lesson works (the method, which is not owned)

1. Short opening conversation in Japanese, not expected to be understood yet.
2. An English narrator breaks it down: one new word/phrase at a time,
   back-chained by syllable from the end ("mas-u", "ri-mas-u"...).
3. Anticipation: narrator asks "How do you say ...?", a silent pause
   (~3-5 s) for the learner to say it, then the native speaker confirms.
4. Graduated interval recall: each item comes back at growing gaps inside
   the lesson (seconds -> minutes) and is reviewed again in later lessons.
5. Each lesson adds ~10-20 new items and recycles earlier ones.
6. Ends with a listen-through of the conversation, now understood.

## Screens

| ID | screen | route / how to reach | purpose | key components | states seen |
| --- | --- | --- | --- | --- | --- |
| S01 | Welcome / onboarding | first open | pick language, level, sign up / trial | language card, CTA buttons | first run |
| S02 | Sign in | from S01 | email / Apple / Google sign-in | form, social buttons | empty, error |
| S03 | Home / Learn | tab: Learn | next lesson card, level + lesson list, progress | next-up card, lesson rows with status ring | new user, mid-course, level complete |
| S04 | Lesson list (level) | S03 -> level | all 30 lessons of a level | lesson row (locked / done / current), download icon | empty progress, partial, done |
| S05 | Audio lesson player | S03/S04 -> lesson | play the lesson | play/pause, skip back/forward, scrubber, speed, time left | playing, paused, finished, offline |
| S06 | Lesson complete | end of S05 | celebrate, mark done, next | summary, "next lesson", "practice" CTAs | completed |
| S07 | Reading lesson | tab or lesson menu | read sounds/characters with audio | character/word rows, play audio | playing, done |
| S08 | Practice hub | tab: Practice | pick a lesson, pick a mode | lesson picker, mode tiles | none unlocked, some unlocked |
| S09 | Flash cards | S08 -> Flash cards | vocab from a lesson, audio on each card | card flip, play audio, know/again | front, back, end of deck |
| S10 | Quick Match | S08 -> Quick Match | multiple-choice match of audio/text to meaning | question, 4 options, timer (speed round) | correct, wrong, results |
| S11 | Speak Easy | S08 -> Speak Easy | role-play the lesson dialogue with transcript | dialogue lines, play per speaker, "your turn" | playing, your turn, done |
| S12 | Voice coach | lesson/practice -> mic | pronunciation check by speech recognition | mic button, score feedback | listening, scored, mic denied |
| S13 | Progress | tab or profile | lessons done, time spent, streak | stats, calendar | none, some |
| S14 | Settings / account | tab: Profile | subscription, downloads, playback, reminders | toggles, list rows | free, trial, subscribed |
| S15 | Drive mode | S05 toggle | big controls for hands-free listening | oversized play/skip | playing |
| S16 | Paywall | locked lesson / end of trial | subscribe | plan cards, trial CTA | trial, expired |

## Flows

```
F01 Do today's lesson (the core loop)
    S03 -> S05 -> S06
    happy path clicks: 2 (tap next lesson, play) then 1 on finish
    edge: app backgrounded / screen locked mid-lesson (audio must keep going),
          resume at exact position next day, phone call interrupts,
          headphones unplugged (pause), offline with no download

F02 Resume a lesson part way
    S03 (next-up card shows "12:40 left") -> S05 at saved position
    happy path clicks: 2
    edge: position saved on another device

F03 Practice vocab from a finished lesson
    S08 -> pick lesson -> S09 or S10 -> results
    happy path clicks: 3
    edge: lesson not done yet (locked or allowed?), deck of 1

F04 Reading lesson
    S03 -> S07 -> done
    happy path clicks: 2
    edge: audio fails to load

F05 Role-play the dialogue
    S08 -> S11 -> choose a role -> speak your lines
    edge: mic permission denied, recognition fails on noisy input

F06 First run to first lesson
    S01 -> S02 -> S03 -> S05
    happy path clicks: ~5
    edge: skip sign-up and start lesson 1 free

F07 Redo or jump to a lesson
    S04 -> any lesson -> S05
    edge: jumping ahead (allowed with warning)
```

## Components

| component | variants | states | used on |
| --- | --- | --- | --- |
| Button | primary, secondary, ghost | default, pressed, disabled, loading | all |
| Tab bar | Learn, Practice, Progress, Profile | active, inactive | S03, S08, S13, S14 |
| Next-up card | new, resume, level done | default, pressed | S03 |
| Lesson row | locked, current, done, in progress | with progress ring, download state | S04 |
| Audio player controls | normal, drive mode | playing, paused, buffering, ended | S05, S15 |
| Scrubber | - | dragging, idle | S05 |
| Flash card | front, back | flipping | S09 |
| Choice tile | - | idle, correct, wrong | S10 |
| Dialogue line | speaker A, speaker B, you | playing, your turn | S11 |
| Mic button | - | idle, listening, processing, denied | S11, S12 |
| Stat tile / streak | - | - | S13 |
| Toast | success, error | - | all |

## Inferred data model

```
User          id, email, created_at, current_level, reminder_time
              evidence: S02, S14     confidence: high

Course        id, language ('ja'), title, levels (1-5)
              evidence: sources 7, 8 confidence: high

Lesson        id, course_id, level, number (1-30), title, duration_s,
              audio_url, script (json timeline of segments)
              evidence: S04, S05     confidence: high (script format is a guess)

Segment       lesson_id, t_start, kind (narration | prompt | pause | answer | dialogue),
              lang (en | ja), text, item_id?
              evidence: method sources 4-6  confidence: guess (internal model for our build)

Item          id, lesson_id (introduced in), ja (kana), romaji, en, audio_url
              evidence: S09, S10     confidence: medium

LessonProgress user_id, lesson_id, position_s, completed_at, plays
              evidence: S03 resume card, S04 status  confidence: high

ItemReview    user_id, item_id, ease, due_at, reps, last_result
              evidence: Practice modes  confidence: guess (Pimsleur doesn't expose SRS outside audio)

ReadingLesson id, level, number, rows (json: kana, romaji, audio)
              evidence: S07          confidence: medium

Subscription  user_id, plan, status, trial_ends_at
              evidence: S16, source 9 confidence: high
```

Relationships: Course 1-n Lesson, Lesson 1-n Segment, Lesson 1-n Item,
User 1-n LessonProgress, User 1-n ItemReview.

## Feature matrix

See `features.csv`. Must: 11, should: 8, could: 7, skip: 4.

## Out of scope (cannot or should not be cloned)

- **Pimsleur's lesson audio, scripts and recordings.** Copyrighted content;
  the clone writes its own lessons and uses text-to-speech.
- **The Pimsleur name, logo, branded terms** ("Speak Easy", "Quick Match",
  "Voice Coach", "Pimsleur Method"). The clone uses its own names.
- **51 languages.** Clone is Japanese only.
- **AI Conversation Coach** — a licensed-LLM feature; possible later, not v1.
- **Native voice actors.** TTS for v1.

## Gaps (verify with a hands-on walkthrough of your own account)

- Exact player controls (skip length, speed options), transcript visibility
  in the player, and whether drive mode still exists in the current version.
- Whether practice modes unlock only after finishing a lesson.

## Size

Screens 16 (v1 builds ~9), flows 7, entities 8.
Hard parts:
1. **Lesson content and timeline generation** — writing good original lessons
   and turning a script into a timed audio track with pauses and spaced
   repeats. This is the actual product.
2. **Japanese TTS quality** — browser voices vary a lot by device; pre-rendered
   audio from a cloud TTS is more consistent but needs an API key.
3. **Background audio on mobile web** — screen lock, interruptions and resume
   are where PWAs struggle versus native.

Size: **M** for the v1 core loop (a few weeks), most of it in lesson writing.
