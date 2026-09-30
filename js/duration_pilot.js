// Standalone single-subject pilot: how stimulus duration affects accuracy and confidence,
// isolated from the difficulty/condition factor by holding counts fixed at one moderate
// 4-choice condition (README's DIFFICULTY_TIERS "medium" tier) while duration varies. Not part
// of the main experiment/CSV schema -- run duration-pilot.html directly. Exists to inform
// STIMULUS_DURATIONS in config.js, which is a placeholder pending exactly this (see README).
// makeConfidenceTrial/makePauseableTrial (expt_util.js) read these -- pause isn't wired up here
// (no P-key handler, single short block), but the names must exist or confidence recording throws
const pauseRequested = false;
const pauseActive = false;
function setPauseHintVisible() {}

const PILOT_COUNTS = [100, 80, 50, 50];
const PILOT_DURATIONS = [50, 100, 150, 250, 400, 600]; // ms
const PILOT_REPS_PER_DURATION = 15; // 90 trials total, ~10 min after chinrest calibration

function buildPilotTrials() {
  const rng = mulberry32(Date.now() >>> 0);
  const trials = [];
  PILOT_DURATIONS.forEach(duration => {
    for (let i = 0; i < PILOT_REPS_PER_DURATION; i++) {
      const colors = shuffle(COLOR_NAMES.slice(), rng);
      trials.push({ colors, counts: PILOT_COUNTS.slice(), correct_color: colors[0], duration });
    }
  });
  return shuffle(trials, rng);
}

// same virtual-chinrest setup as session_flow.js's chinrestTrial(), duplicated rather than
// pulling in that whole file (and its main-study save/resume machinery) for one trial
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

const PILOT_CSV_HEADER = 'duration,colors,counts,correct_color,resp,acc,rt,conf,c_rt';

function pilotRowToCsvLine(row) {
  const fields = [
    row.duration, `[${row.colors.join(',')}]`, `[${row.counts.join(',')}]`, row.correct_color,
    row.resp, row.acc, row.rt, row.conf, row.c_rt,
  ];
  return fields.map(csvField).join(',');
}

// no feedback and no practice, mirroring the main experiment's own main-trial convention (see
// buildMainTimeline in session_flow.js) -- this is the researcher running themself, not a naive
// subject, so a single instructions screen covers it
function buildPilotTimeline(trials, rows) {
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
        <p>Duration pilot: same task as the main experiment (most-numerous color, HJKL keys,
        1-4 confidence). One difficulty level, ${PILOT_DURATIONS.length} flash durations,
        ${PILOT_REPS_PER_DURATION} reps each, no feedback, no practice.</p>
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
        const csvText = PILOT_CSV_HEADER + '\n' + rows.map(pilotRowToCsvLine).join('\n');
        const now = new Date();
        downloadCsvText(`duration_pilot_${formatDate(now)}_${formatTime(now)}.csv`, csvText);
        jsPsych.finishTrial();
      });
    },
  };
}

const jsPsych = initJsPsych({ display_element: 'jspsych-target' });
const pilotTrials = buildPilotTrials();
const pilotRows = [];

jsPsych.run([
  { type: jsPsychFullscreen, fullscreen_mode: true },
  pilotChinrestTrial(),
  pilotInstructionsTrial(),
  ...buildPilotTimeline(pilotTrials, pilotRows),
  pilotDownloadTrial(pilotRows),
]);
