# MAFC testing experiment

Standalone port of the previous MAFC main experiment, rebuilt around a new condition set. It
shares no files, no data directory, and no filename prefix with the original — drop it on a PHP
host and it runs on its own.

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

**Trial budget (assumption, not specified):** 90 reps × 8 conditions = 720 trials,
run as one session of 3 runs × 4 blocks × 60 trials. 720 is carried over from the previous
experiment's per-session length and divides evenly by both 8 and 12. To change it, edit `N_REPS`,
`N_SESSIONS`, `SESSION_SIZE` in `js/config.js` and keep

    N_REPS * 8 === N_SESSIONS * SESSION_SIZE

with `SESSION_SIZE` divisible by `N_TRIAL_TO_BREAK * BLOCKS_PER_RUN * RUNS_PER_SESSION`.

Verified per subject: each session is exactly 720 trials, 90 per condition, 180 per correct
color, and within any single condition the correct-color counts differ by at most 1. Trial lists
are deterministic from the subject seed.

## What carries over unchanged

`style.css`, `img/card.png`, and `js/{colors,rng,permutations,stimulus,color_calibration,main}.js`
retain the original behavior. The HJKL color mapping, virtual chinrest and degree-based sizing,
2-rep color-matching calibration, save-every-trial/retry/resume machinery, and all previous CSV
fields remain in place.

The output CSV retains the previous fields but adds `duration` immediately after `trial`, so it is
not byte-for-byte identical to the previous experiment's header. `top` is `counts[0]` and
`ratio_1..3` are `counts[i] / top`.

## What changed, and why

**`js/conditions.js` — counts are now the source of truth.** The old CSV stored `top` plus ratios
of it. This design is stated in counts, and while every condition here happens to be expressible
as `top=100` × a clean ratio, a future one might not be. The file now stores counts and derives
`top`/`ratios` for the data columns.

**`js/triallist.js` — permutation cycle refill (this is a real bug fix, not just a port).** The
old builder shuffled the 24 color permutations once per condition per session and popped from
them without ever refilling. That was safe only because 75 conditions × 96 reps meant each
condition got 9–10 trials per session, always fewer than 24. With 8 conditions each condition
gets 90 trials per session, the buckets empty partway through, and the color picker reads off an
empty list. Running the original builder against this design throws
`TypeError: Cannot read properties of undefined (reading 'pop')` on the first condition. The
cycle is now reshuffled whenever every bucket is empty, so each full sweep of 24 permutations is
used once before any repeats.

**Stimulus duration and backward mask.** Each main and practice trial carries one duration from
`STIMULUS_DURATIONS` (`150` or `400` ms currently). Durations are assigned with the seeded RNG
after trial construction: each `(n_choice, condition_id, correct_color)` cell is balanced as
evenly as possible, and session-wide counts are exactly equal when the session size allows it.
The same balancing rule is applied to practice trials within each condition. Immediately after
the stimulus, a 50 ms grayscale mask displays 280 newly placed dots. The fixed mask count
prevents the mask from revealing the stimulus's numerosity, and the mask is necessary for the
nominal durations to define effective viewing time.

`STIMULUS_DURATIONS` remains a placeholder pending a pilot accuracy curve. If its levels are
changed, keep the backward mask enabled so the intended duration manipulation remains valid.

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

**Trial labels.** The first screen accepts a manually chosen label containing 1-40 letters,
numbers, underscores, or hyphens. The label is saved in `sid`, determines the reproducible trial
order, and is used in filenames such as `data/MAFC2_EXPT_trial-001_S01.csv` and
`data/MAFC2_EXPT_trial-001_COLOR.csv`.

**Single-session wording.** The chinrest intro no longer says "access to this monitor for the
next 10 weeks", the pre-check no longer asks about matching a previous session's monitor, and the
completion screen no longer says "return next week". The multi-session code paths
(`CHINREST_INTRO_TEXT_RETURNING`, `buildRepeatPracticeBlocks`, `resolveSessionPlan`'s
next-session branch) are all left intact and still keyed off `isFirstSession`, so raising
`N_SESSIONS` is a one-constant change.

## Deploy

Copy the folder to a PHP-capable web root and open `index.html` over `http(s)://`, not `file://`
(the endpoints are fetched relative to the page). PHP creates `data/` on first save; make sure
the web server user can write to the folder. Then check `data/` for the two CSV files after a
short run.

## Not yet addressed

- `APERTURE_RADIUS_DEG` and `DOT_RADIUS_DEG` are still the original placeholders pending real
  display calibration. Max density here is 280 dots (`[100,80,65,35]`), below the previous
  experiment's, so rejection sampling has room — but the values are still unvalidated.
- `STIMULUS_DURATIONS = [150, 400]` is still provisional pending a pilot accuracy curve. The
  duration manipulation assumes the 50 ms grayscale backward mask remains enabled.
- Practice pools repeat conditions rather than sampling distinct ones (3 conditions across 20
  trials). Harmless — practice is never saved — but worth a look if you want more variety.
