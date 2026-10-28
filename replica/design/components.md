# Components

Own design. Tokens in `tokens.json` (13 pairs, 0 AA failures), mapped to
Tailwind roles in `tailwind.config.ts` via CSS variables in `app/globals.css`.
Icons: Lucide (ISC). Fonts: system stacks (Inter if installed, Noto Sans JP / Hiragino for Japanese).

Button (primary)
  sizes     h-12 full width (cards), 80px round (player play/pause)
  states    default, active (scale/opacity), focus-visible (2px accent ring)
  tokens    bg accent, text on-accent, radius md
  a11y      real <button>/<a>, icon-only buttons have aria-label
  used on   S03, S05, S06

Next-up card            S03   new / resume (progress bar + time left) / all done
Lesson row              S03   done (success check) / up next (accent number) / in progress / not started
Stat tile               S03   streak, lessons done, minutes
Segment view            S05   ready / listen / your turn (accent ring, ping, answer hidden) / repeat / answer / dialogue speaker
                              aria-live=polite; text hidden entirely when "show text" is off
Scrubber                S05   native range input, aria-valuetext "m:ss of m:ss"
Transport               S05   skip back (previous phrase), play/pause, skip forward (next phrase)
Voice banner            all   no speech / no Japanese voice, with how to install one
Completion              S06   next lesson / replay / home
Settings controls       S14   speed slider, answer-time segmented buttons (aria-pressed), show-text checkbox, voice test
