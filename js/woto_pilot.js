// Standalone single-subject pilot: does the wrong-option trade-off (WOTO) effect scale with
// internal noise (duration)? Crosses two conditions that isolate distractor spread -- same
// target (100) and same top distractor (80, so top-2 difference is 20 in both), differing only
// in how the remaining 100 splits across the last two distractors: [100,80,50,50] (even split,
// low spread) vs [100,80,65,35] (uneven split, high spread) -- against two durations (300ms
// short / 600ms long, both validated in the earlier duration pilot). If WOTO scales with noise,
// the confidence gap between low- and high-spread should be bigger at 300ms than at 600ms.
// Not part of the main experiment/CSV schema -- open woto-pilot.html directly.
const SPREAD_CONDITIONS = {
  low: [100, 80, 50, 50],
  high: [100, 80, 65, 35],
};
const WOTO_DURATIONS = { short: 300, long: 600 };
const WOTO_REPS_PER_CELL = 25; // 2 spreads x 2 durations x 25 = 100 trials, ~10-12 min

function buildWotoTrials() {
  const rng = mulberry32(Date.now() >>> 0);
  const trials = [];
  Object.entries(SPREAD_CONDITIONS).forEach(([spread, counts]) => {
    Object.entries(WOTO_DURATIONS).forEach(([durationLabel, duration]) => {
      for (let i = 0; i < WOTO_REPS_PER_CELL; i++) {
        const colors = shuffle(COLOR_NAMES.slice(), rng);
        trials.push({ colors, counts: counts.slice(), correct_color: colors[0], duration, spread, durationLabel });
      }
    });
  });
  return shuffle(trials, rng); // interleaves every cell trial-by-trial, per design discussion
}

// same virtual-chinrest setup as session_flow.js's chinrestTrial(), duplicated (as in
// duration_pilot.js) rather than pulling in that whole file for one trial
function pilotChinrestTrial() {
  return {
    type: jsPsychVirtualChinrest,
    blindspot_reps: 2,
    resize_units: 'none',
    pixels_per_unit: 30,
    item_path: 'img/card.png',
    viewing_distance_report: 'none',
  };
}

const WOTO_CSV_HEADER = 'duration,duration_label,spread,colors,counts,correct_color,resp,acc,rt,conf,c_rt';

function wotoRowToCsvLine(row) {
  const fields = [
    row.duration, row.durationLabel, row.spread, `[${row.colors.join(',')}]`, `[${row.counts.join(',')}]`,
    row.correct_color, row.resp, row.acc, row.rt, row.conf, row.c_rt,
  ];
  return fields.map(csvField).join(',');
}

// no feedback and no practice, mirroring the main experiment's own main-trial convention (see
// buildMainTimeline in session_flow.js) -- this is the researcher running themself
function buildWotoTimeline(trials, rows) {
  const nodes = [];
  trials.forEach(trial => {
    const result = {};
    nodes.push(
      makeFixationTrial(),
      makeStimulusTrial(trial),
      makeDecisionTrial(trial, result),
      makeConfidenceTrial(result, function () { rows.push({ ...trial, ...result }); }),
    );
  });
  return nodes;
}

function pilotInstructionsTrial() {
  return {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `
      <div style="font-size:1.4em; max-width:640px;">
        <p>WOTO x duration pilot: same task as the main experiment (most-numerous color, HJKL
        keys, 1-4 confidence). Two distractor-spread conditions x two durations
        (${WOTO_DURATIONS.short}ms / ${WOTO_DURATIONS.long}ms), ${WOTO_REPS_PER_CELL} reps each
        cell, interleaved, no feedback, no practice.</p>
        <p>Press spacebar to begin.</p>
      </div>`,
    choices: [' '],
  };
}

function pilotDownloadTrial(rows) {
  return {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: '<p>Done. <button id="pilot-save-btn" style="font-size:1.1em; padding:8px 24px;">Save data to computer</button></p>',
    choices: 'NO_KEYS',
    on_load: function () {
      document.getElementById('pilot-save-btn').addEventListener('click', function () {
        const csvText = WOTO_CSV_HEADER + '\n' + rows.map(wotoRowToCsvLine).join('\n');
        const now = new Date();
        downloadCsvText(`woto_pilot_${formatDate(now)}_${formatTime(now)}.csv`, csvText);
        jsPsych.finishTrial();
      });
    },
  };
}

// blurs a still-focused button left over from the previous trial -- without this, a stale-
// focused button (e.g. the chinrest card-resize screen's confirm button) can intercept the next
// trial's Space/Enter as a re-click of itself instead, which is what makes the chinrest's
// blind-spot screen need an extra mouse click before spacebar works
const jsPsych = initJsPsych({
  display_element: 'jspsych-target',
  on_trial_finish: function () {
    if (document.activeElement && document.activeElement.tagName === 'BUTTON') {
      document.activeElement.blur();
    }
  },
});
const wotoTrials = buildWotoTrials();
const wotoRows = [];

jsPsych.run([
  { type: jsPsychFullscreen, fullscreen_mode: true },
  pilotChinrestTrial(),
  pilotInstructionsTrial(),
  ...buildWotoTimeline(wotoTrials, wotoRows),
  pilotDownloadTrial(wotoRows),
]);
