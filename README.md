# WOTO: multi-alternative perceptual choice experiment

![jsPsych](https://img.shields.io/badge/jsPsych-7.3-4B6CB7?style=flat-square)
![JavaScript](https://img.shields.io/badge/JavaScript-vanilla-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![PHP](https://img.shields.io/badge/PHP-optional%20save-777BB4?style=flat-square&logo=php&logoColor=white)
![Status](https://img.shields.io/badge/status-piloting-orange?style=flat-square)

A browser-based psychophysics experiment, built with jsPsych, testing the **wrong-option
trade-off (WOTO)**: whether choosing among several options depends not only on the gap between
the best option and the runner-up, but on how the remaining distractors are spread. On each
trial a brief cloud of colored dots appears, the participant reports the most numerous color
with one of four keys, then rates their confidence.

- **Controlled stimuli.** A virtual chinrest sizes everything in degrees of visual angle, and an
  equiluminant four-color palette (equal CAM16 lightness and colorfulness) is calibrated per
  participant against a fixed green reference: pairwise matching, then all colors together with
  a check-and-refine step.
- **Balanced, reproducible design.** 8 dot-count conditions × 2 stimulus durations
  (100 / 500 ms), with seeded trial lists balanced per condition, correct color and duration.
  A Node script (`verify_durations.js`) checks those guarantees per subject.
- **Runs anywhere.** On a PHP host every trial is saved to `woto_data/` as it happens and
  sessions resume after a crash (re-enter the same username); with no server it asks the
  participant to download the data at the end.
- **Pilots.** Standalone duration, palette-bias and WOTO × duration pilots informed the main
  design.

The rest of this README is the lab notebook: design parameters and what changed from the
previous MAFC (multi-alternative forced choice) experiment it was ported from.

---

Standalone port of the previous MAFC main experiment, rebuilt around new condition set.

## Design

Eight conditions, specified in dot counts:

| n_choice | condition_id | counts |
|---|---|---|
| 3 | 0 | 100, 70, 70 |
| 3 | 1 | 100, 80, 60 |
| 3 | 2 | 100, 90, 50 |
| 4 | 0 | 100, 80, 50, 50 |
| 4 | 1 | 100, 80, 65, 35 |
| 4 | 2 | 100, 70, 55, 55 |
| 4 | 3 | 100, 70, 70, 40 |
| 4 | 4 | 100, 60, 60, 60 |

`condition_id` is the row's position within its `n_choice` group, same convention as before, so
reordering `CONDITIONS_CSV` in `js/conditions.js` renumbers saved data. Don't reorder after
collection starts.

**Trial budget:** 90 reps × 8 conditions = 720 trials (45 per condition per duration), run as one
session of 18 blocks × 40 trials (a break after every block). Each condition's reps split evenly
across `STIMULUS_DURATIONS` (100 / 500 ms). To change it, edit `N_REPS`, `N_SESSIONS`,
`SESSION_SIZE` in `js/config.js` and keep

    N_REPS * 8 === N_SESSIONS * SESSION_SIZE

with `SESSION_SIZE` divisible by `N_TRIAL_TO_BREAK * BLOCKS_PER_RUN * RUNS_PER_SESSION`.

Verified per subject (`verify_durations.js`): each session is exactly `SESSION_SIZE` trials, split
exactly in half between the two durations session-wide and within every condition, and within any
single `(n_choice, condition_id, correct_color)` cell the two durations' counts differ by at most 1.
Trial lists are deterministic from the participant's username (it seeds the trial RNG).

Day-1 practice is a single 20-trial easy+medium mixed block with feedback (`N_PRACTICE_MIXED_DAY1`
in `js/config.js`), shrunk from the original 60 (20 easy w/ feedback, 20 medium w/ feedback, 20
mixed w/o feedback) to keep practice proportionate to the smaller 160-trial main session.

## What carries over unchanged

`style.css`, `img/card.png`, and `js/{colors,rng,permutations,stimulus,color_calibration,main}.js`
retain the original behavior. The HJKL color mapping, virtual chinrest and degree-based sizing,
save-every-trial/retry/resume machinery, and all previous CSV fields remain in place. The color
calibration has since been extended (see "Color calibration: check and refine" below).

The output CSV retains the previous fields but adds `duration` immediately after `trial`, so it is
not byte-for-byte identical to the previous experiment's header. `top` is `counts[0]` and
`ratio_1..3` are `counts[i] / top`.

**No pausing.** There used to be a `P`-to-pause key. Per Doby it was removed: people should rest
during the breaks, not mid-block, and the trial right after a pause was hard. Instead, blocks are
short (40 trials, `N_TRIAL_TO_BREAK`), so breaks come often. A trial someone had to step away
from shows up as a very long RT and is excluded at analysis. The pause feature was also behind the
three malformed rows (trials 52, 201, 202) in the 400-trial pilot.

The break screen asks participants to take a slightly longer break if they feel lazy or
distracted; the "Press spacebar to continue to the next block" screen after the 30 s countdown
waits indefinitely, so a longer break needs no extra code.

**Color calibration: green reference.** Green is fixed at `GREEN_FIXED_GAIN` (0.55) and can't be
changed; the other colors' sliders run green ± `CALIBRATION_RANGE` (0.25-0.85). Step 1: one
pairwise screen per other color (only green and that color's dots, its slider starting at a random
position). Step 2: all four colors together, starting at the step-1 values; then 3 brief
equal-count dot clouds (1.5 s each) to judge whether any color stands out or is hard to notice;
then one refinement screen starting where they left off, whose values are final. In
`woto_data/woto_<username>_color.csv`, rows 1-3 are the orange/blue/magenta pairwise screens, row
4 the all-colors screen and row 5 the refinement. The main CSV's `gain_*` columns hold the final
gains. 0.55 sits mid-range so the whole display can't end up dim, and slightly below the green the
first pilots matched to, since green was over-picked as a wrong option; because the others are
matched to green, it mostly sets overall brightness.

## What changed

**`js/conditions.js` — counts are now the source of truth.** The old CSV stored `top` plus ratios
of it. This design is stated in counts, and while every condition here happens to be expressible
as `top=100` × a clean ratio, a future one might not be. The file now stores counts and derives
`top`/`ratios` for the data columns.

**`js/triallist.js` — permutation cycle refill.** The
old builder shuffled the 24 color permutations once per condition per session and popped from
them without ever refilling. That was safe only because 75 conditions × 96 reps meant each
condition got 9–10 trials per session, always fewer than 24. With 8 conditions each condition
gets 90 trials per session, the buckets empty partway through, and the color picker reads off an
empty list. Running the original builder against this design throws
`TypeError: Cannot read properties of undefined (reading 'pop')` on the first condition. The
cycle is now reshuffled whenever every bucket is empty, so each full sweep of 24 permutations is
used once before any repeats.

**Color palette.** `js/colors.js` now ships the Equiluminant 4 set (see
`palette-review-final.html`) in place of the old full-saturation RGBY primaries: orange
`#D78426`, green `#56B16E`, blue `#40A4E4`, magenta `#CA79C4`, equal in CAM16 lightness and
colorfulness. The page background (`style.css`, all three background-color rules) moved from
mid-grey `rgb(127,127,127)` to `#3B3B3B` (L* 25), the set's recommended surround at Michelson
contrast 0.76 — without an offset background these equiluminant colors would carry almost no
luminance contrast against a mid-grey field. Canvas ink that used to be plain `black`
(fixation cross, prompt text, legend borders, confidence-preview text) is now `white` so it
stays legible against the darker surround; the `black` on the four legend/HJKL key labels is
unchanged since those sit on top of the (still light, L*~62-65) color swatches, not the page
background. `red`→`orange` and `yellow`→`magenta` throughout (COLOR_NAMES, COLOR_KEYS,
COLOR_CODES, gain columns in both CSV headers, `progress.php`'s `$colorColumns`) since the old
names no longer describe what's on screen and `drawFeedback` shows the literal color name to
subjects.

**Stimulus duration.** Each main and practice trial carries one duration from
`STIMULUS_DURATIONS` (`100` or `500` ms currently, chosen from the duration pilot below). Durations
are assigned with the seeded RNG after trial construction: each `(n_choice, condition_id,
correct_color)` cell is balanced as evenly as possible, and session-wide counts are exactly equal
when the session size allows it (160 trials / 2 durations = 80 each). The same balancing rule is
applied to practice trials within each condition.

`STIMULUS_DURATIONS` remains a placeholder pending a pilot accuracy curve.

**Verification artifact.** `verify_durations.js` is a Node-only check and is not loaded by the
experiment. Run `node verify_durations.js` from the project root to verify session size, global
duration balance, per-cell balance, and deterministic trial generation for representative subjects.

**`[2, 3, 4]` → `N_CHOICE_SIZES`.** No two-choice conditions in this design. The literal was
hard-coded in three places; it's now one exported constant in `conditions.js`.

**Difficulty tiers.** `buildDifficultyTiers` is unchanged (its divmod sizing already handled any
pool size) but now splits 8 conditions 3/3/2 instead of 75 conditions 25/25/25. Easy is
`[100,70,55,55]`, `[100,60,60,60]`, `[100,80,65,35]`; hard is `[100,80,60]`,
`[100,80,50,50]`, `[100,90,50]`.
Ranking by `ratio1` alone is coarse at this pool size — it ignores how many distractors sit just
behind the leader — so revisit if practice feels mis-pitched.

**Instruction illustrations.** The greyed-legend example page was a 2-choice trial; it's now
3-choice, since a 2-color trial no longer exists and showing one would advertise a trial type the
subject never sees. Example dot counts dropped from `[160,40,40,40]` to `[100,25,25,25]` to match
this design's density.

**Seeds.** New per-subject seeds, so a subject who ran both studies doesn't get correlated orders.

**Trial labels, then no trial label.** The first screen used to accept a manually chosen label
(1-40 letters/numbers/underscores/hyphens) that seeded the trial order and named the saved files.
That's gone now: pressing spacebar on the pre-check screen starts the session immediately.
`main.js` generates a timestamp-based run id internally (`String(Date.now())`) to seed the RNG and
fill the CSV's `sid` column, but nobody types anything, and the downloaded file is always named
`rename.csv` -- give it a real name after saving. `TRIAL_LABEL_PATTERN` and the old
`DATA_PREFIX`-based filename builder are gone from `js/config.js`/`js/session_flow.js`
accordingly; the three PHP endpoints (used only in server-backed mode) are unaffected.

**Chinrest distance reps, 3 -> 2.** `blindspot_reps` on every `jsPsychVirtualChinrest` trial
(the main experiment and all three standalone pilots) dropped from 3 to 2.

**Feedback duration, 500ms -> 900ms.** Doby reported not having enough time to read the "The
correct answer is X." text before the next trial started during the practice block.
`FEEDBACK_DURATION` in `js/expt_util.js`, flat for every feedback trial regardless of accuracy.

**Stale button focus no longer eats the next trial's keypress.** A clicked `<button>` keeps
keyboard focus into the next trial; natively, Space/Enter on a focused button re-clicks it
instead of reaching that next trial's own listener. This is what made the chinrest's blind-spot
"press space to begin" screen need an extra mouse click before spacebar worked (right after
clicking the card-resize screen's confirm button) -- and is the likely cause of occasional rapid
double-advances ("flashes") through a screen right after any button-click transition. Fixed
globally via `on_trial_finish` in every `initJsPsych(...)` call (main experiment and all three
pilots): blurs `document.activeElement` if it's still a `<button>` when a trial ends. Verified
live: `document.activeElement` is `BODY`, not the button, on the blind-spot screen after clicking
through the card-resize step.

**Single-session wording.** The chinrest intro no longer says "access to this monitor for the
next 10 weeks", the pre-check no longer asks about matching a previous session's monitor, and the
completion screen no longer says "return next week". The multi-session code paths
(`CHINREST_INTRO_TEXT_RETURNING`, `buildRepeatPracticeBlocks`, `resolveSessionPlan`'s
next-session branch) are all left intact and still keyed off `isFirstSession`, so raising
`N_SESSIONS` is a one-constant change.

## Deploy

Participants run `woto.html`; `woto_test.html` is the same page with 16 main trials and 4 practice
trials, for checking the flow and server saving before collection. Both are single files with
every local dependency inlined (still need internet for the jsPsych CDN scripts), regenerated with:

```bash
node build_standalone.js . '{}' woto.html
node build_standalone.js . '{"N_REPS":2,"SESSION_SIZE":16,"N_TRIAL_TO_BREAK":8,"BLOCKS_PER_RUN":2,"N_PRACTICE_MIXED_DAY1":4,"BREAK_DURATION":5,"DATA_PREFIX":"woto_test"}' woto_test.html
```

(the JSON overrides `js/config.js` constants for that build only).

**Server (Plesk):** upload `woto.html`, `woto_test.html`, `save.php`, `save_color.php`,
`progress.php` and `data_dir.php` to the same folder. The first save creates `woto_data/` next to
them (with an `.htaccess` blocking web access); the PHP user needs write permission there.
Flow: consent → Georgia Tech username (e.g. `jsherrier3`, `@gatech.edu` is stripped) → pre-check →
experiment. Every trial is saved as it happens to `woto_data/woto_<username>.csv` (calibration to
`woto_<username>_color.csv`); the test page writes `woto_test_<username>...` instead, so test runs
never collide with or resume a real participant's file. Re-entering the same username after a
crash resumes where the saved data ends; after a finished session it shows the completion screen.
Check that `https://<site>/<folder>/woto_data/` returns 403: if Plesk's nginx serves static files
directly, the `.htaccess` is skipped and the folder must be protected in Plesk instead.

**No server:** if the save endpoints can't be reached (file opened locally, plain static host) or a
save fails after every retry, the end screen asks the participant to download
`woto_<username>.csv` and email it.

Older builds (`index-standalone.html`, 160 trials; `index-standalone-joseph.html`, 400 trials)
predate the current calibration and server setup and are kept only as records of what earlier
pilots ran.

## Duration pilot

`duration-pilot.html` is a standalone, single-subject instrument for the accuracy/confidence-vs-
duration curve `STIMULUS_DURATIONS` is still waiting on. It reuses the same chinrest calibration,
dot-cloud rendering, HJKL response and confidence rating as the main task, but holds difficulty
fixed at one moderate 4-choice condition (`[100,80,50,50]`) and sweeps `PILOT_DURATIONS`
(currently `[50,100,150,250,400,600]` ms, 15 reps each — 90 trials, ~10 minutes) so duration is
the only thing varying. No feedback, no practice, no server save: it downloads its own small CSV
(`duration,colors,counts,correct_color,resp,acc,rt,conf,c_rt`) client-side at the end via a
button click. It is not wired into `index.html`/`session_flow.js` and doesn't share a CSV schema
with the main study — open `duration-pilot.html` directly. Once real per-duration accuracy/
confidence is in hand, update `STIMULUS_DURATIONS` in `js/config.js` accordingly.

## Not yet addressed

- `APERTURE_RADIUS_DEG` and `DOT_RADIUS_DEG` are still the original placeholders pending real
  display calibration. Max density here is 280 dots (`[100,80,65,35]`), below the previous
  experiment's, so rejection sampling has room — but the values are still unvalidated.
- `STIMULUS_DURATIONS = [100, 500]` is set (each of the 8 conditions runs at both, 45 reps
  apiece), but it hasn't itself been validated against a larger sample — the single-subject
  duration and WOTO x duration pilots above are what it's based on.
- Practice pools repeat conditions rather than sampling distinct ones (3 conditions across 20
  trials). Harmless — practice is never saved — but worth a look if you want more variety.
