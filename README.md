# WOTO: multi-alternative perceptual choice experiment

![jsPsych](https://img.shields.io/badge/jsPsych-7.3-4B6CB7?style=flat-square)
![JavaScript](https://img.shields.io/badge/JavaScript-vanilla-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![PHP](https://img.shields.io/badge/PHP-server%20save-777BB4?style=flat-square&logo=php&logoColor=white)
![Status](https://img.shields.io/badge/status-piloting-orange?style=flat-square)

A browser-based psychophysics experiment, built with jsPsych, testing the **wrong-option
trade-off (WOTO)**: whether choosing among several options depends not only on the gap between
the best option and the runner-up, but on how the remaining wrong options are spread. On each
trial a brief cloud of colored dots appears, the participant reports the most numerous color
with one of four keys, then rates their confidence.

- **Controlled stimuli.** A virtual chinrest sizes everything in degrees of visual angle, and an
  equiluminant four-color palette is calibrated per participant against a fixed green reference.
- **Balanced, reproducible design.** 8 dot-count conditions × 2 stimulus durations (100 / 500 ms),
  with seeded trial lists balanced per condition, correct color and duration. `verify_durations.js`
  checks those guarantees.
- **Crash-safe saving.** On a PHP host every trial is saved as it happens, and re-entering the
  same username resumes an interrupted session. Without a server, the participant downloads the
  data at the end.

## Session flow

1. **Consent:** the Georgia Tech IRB2026-66 online consent form (`js/consent.js`), including the
   choice to allow de-identified data to be stored and shared.
2. **Username:** the participant's Georgia Tech username (e.g. `gburdell3`; `@gatech.edu` is
   stripped). It names the data file and seeds the trial order.
3. **Pre-check:** zoom at 100%, Chrome or Firefox, an hour of undisturbed time, steady lighting.
4. **Virtual chinrest:** card-size and blind-spot measurement (2 reps) for degrees-to-pixels.
5. **Color calibration** (below).
6. **Instructions and practice:** 20 easy/medium trials with feedback.
7. **Main trials:** 720 trials in 18 blocks of 40, with a 30 s break after each block (spacebar
   skips it; the next screen waits, so participants can rest longer). No feedback. There is no
   pause key: a trial someone steps away from shows up as a very long RT and is dropped at
   analysis.
8. **End:** a completion screen once the server has confirmed the data, or a download button if
   it hasn't.

Each trial: fixation (500 ms) → dot cloud (100 or 500 ms) → color choice (H / J / K / L, legend on
screen) → confidence 1–4. Practice adds 900 ms of feedback. The instructions encourage using the
whole confidence scale.

## Design

Eight conditions, specified in dot counts (target first):

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

Pairs such as `[100,80,50,50]` / `[100,80,65,35]` and `[100,70,55,55]` / `[100,70,70,40]` keep the
target, the runner-up and the total of the remaining dots fixed, and differ only in how the
remaining dots are split.

`condition_id` is the row's position within its `n_choice` group (`CONDITIONS_CSV` in
`js/conditions.js`), so reordering rows renumbers saved data. Don't reorder after collection starts.

**Trial budget:** 90 reps × 8 conditions = 720 trials, 45 per condition per duration. Colors are
assigned to count ranks by cycling through all 24 color permutations. To change the budget, edit
`N_REPS` and `SESSION_SIZE` in `js/config.js` and keep

    N_REPS * 8 === N_SESSIONS * SESSION_SIZE

with `SESSION_SIZE` divisible by `N_TRIAL_TO_BREAK * BLOCKS_PER_RUN * RUNS_PER_SESSION`.

`node verify_durations.js` checks, for representative subjects, that each session has exactly
`SESSION_SIZE` trials, splits exactly in half between the two durations overall and within every
condition, keeps every `(n_choice, condition_id, correct_color)` cell within 1 trial across
durations, and regenerates identically from the same seed.

## Color calibration

The palette (`js/colors.js`) is Equiluminant 4: orange `#D78426`, green `#56B16E`, blue `#40A4E4`,
magenta `#CA79C4`, equal in CAM16 lightness and colorfulness, on a `#3B3B3B` background (see
`palette-review-final.html`). Each color's gain dims it toward black (1.0 = unadjusted).

- Green is the reference, fixed at `GREEN_FIXED_GAIN` (0.55). The other sliders run green ±
  `CALIBRATION_RANGE` (0.25–0.85).
- **Step 1:** one screen each for orange, blue and magenta, showing only green and that color.
  The participant moves that color's slider (starting at a random position) until neither color
  looks more noticeable.
- **Step 2:** all four colors together, starting from the step-1 values; then 3 brief clouds with
  equal counts of every color (1.5 s each) to judge whether any color stands out or is hard to
  notice; then one final adjustment. Its values are used for the rest of the session.

0.55 sits mid-range so the display can't end up dim overall. It's slightly below the green level
the first pilot participants matched to, since green was over-picked as a wrong option; because
the other colors are matched to green, it mostly sets overall brightness.

## Data

Files are written to `woto_data/` next to the page:

- `woto_<username>.csv`: one row per main trial, rewritten after every trial.
- `woto_<username>_color.csv`: one row per calibration screen. Rows 1–3 are the orange / blue /
  magenta pairwise screens, row 4 the all-colors screen, row 5 the final adjustment.

Main CSV columns:

| column | meaning |
|---|---|
| `date`, `time` | when the row was saved (YYYYMMDD, HHMMSS) |
| `sid`, `seed` | username and the trial-order seed derived from it |
| `gain_orange` … `gain_magenta` | final calibration gains |
| `session`, `trial` | session number (always 1) and 0-based trial index |
| `duration` | dot-cloud duration, ms |
| `n_choice`, `condition_id` | condition (see Design) |
| `top`, `ratio_1`–`ratio_3` | `counts[0]` and `counts[i] / top` (`ratio_3` blank on 3-choice trials) |
| `colors`, `counts` | color codes and dot counts, in count-rank order (target first) |
| `stim`, `resp`, `acc` | correct color, chosen color, 1 if correct |
| `rt`, `conf`, `c_rt` | choice RT (s), confidence 1–4, confidence RT (s) |
| `share_data` | consent to store and share de-identified data (`yes` / `no`) |

Color codes: 1 orange, 2 green, 3 blue, 4 magenta. Keys: orange H, green J, blue K, magenta L.

## Deploy

Participants run `woto.html`. `woto_test.html` is the same page with 4 practice and 16 main trials,
for checking the flow and server saving before collection; it writes `woto_test_<username>...`
files so test runs never mix with or resume a real participant's data. Both are single files with
every local script, style and image inlined (they still need internet for the jsPsych CDN). Rebuild
them after any change to `js/`, `style.css` or `img/`:

```bash
node build_standalone.js . '{}' woto.html
node build_standalone.js . '{"N_REPS":2,"SESSION_SIZE":16,"N_TRIAL_TO_BREAK":8,"BLOCKS_PER_RUN":2,"N_PRACTICE_MIXED_DAY1":4,"BREAK_DURATION":5,"DATA_PREFIX":"woto_test"}' woto_test.html
```

The JSON argument overrides `js/config.js` constants for that build only.

**Server (Plesk or any PHP host):** upload `woto.html`, `woto_test.html`, `save.php`,
`save_color.php`, `progress.php` and `data_dir.php` to one folder. The first save creates
`woto_data/` with an `.htaccess` that blocks web access; the PHP user needs write permission. The
data files carry usernames, so confirm that `https://<site>/<folder>/woto_data/` returns 403. If
nginx serves static files directly, the `.htaccess` is skipped and the folder has to be protected
in the hosting panel (or moved outside the web root).

Re-entering a username resumes from the last saved trial (calibration and practice are skipped if
already done); a finished username shows the completion screen.

**No server:** if the endpoints can't be reached (file opened locally, static host) or a save fails
after every retry, the end screen asks the participant to download `woto_<username>.csv` and email
it.

`index.html` runs the same experiment from the unbundled `js/` files, for development.

## Files

| file | role |
|---|---|
| `js/config.js` | every tunable constant and all participant-facing text |
| `js/conditions.js`, `js/triallist.js`, `js/permutations.js`, `js/rng.js` | conditions, seeded trial lists, duration balancing |
| `js/colors.js`, `js/color_calibration.js` | palette, gains, calibration screens |
| `js/stimulus.js`, `js/expt_util.js` | dot placement and drawing, trial builders, saving |
| `js/main_instructions.js`, `js/consent.js` | instruction pages, consent form |
| `js/session_flow.js`, `js/main.js` | session timeline, resume, completion; entry point |
| `save.php`, `save_color.php`, `progress.php`, `data_dir.php` | server saving and resume |
| `build_standalone.js`, `verify_durations.js` | single-file builder, design check |

## Pilots

Standalone single-subject pages that informed the design. Each downloads its own CSV and doesn't
share the main data format:

- `duration-pilot.html`: accuracy and confidence across durations (50–600 ms) at one fixed condition.
- `woto-pilot.html`: even vs uneven distractor split × two durations.
- `palette-bias-pilot.html`: accuracy by target color, Equiluminant 4 vs full-saturation primaries.
- `palette-review-final.html`: palette candidates and background contrast.

`index-standalone.html` (160 trials) and `index-standalone-joseph.html` (400 trials) are earlier
builds kept as records of what the first pilots ran.

## Open questions

- Color and response key are fixed together (green is always J), so a color bias and a key bias
  can't be told apart.
- Practice draws repeatedly from a few easy/medium conditions rather than sampling distinct ones.
