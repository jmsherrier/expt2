// Standalone single-subject pilot: does Equiluminant 4 actually produce a flatter (less biased)
// accuracy/confidence pattern between colors than the old full-saturation palette? Real
// forced-choice trials with genuine correct answers, across the project's actual five 4-choice
// conditions (README's easy/medium/hard tiers) -- not a rigged tied-count display, which would
// tell the subject there's no real task and risk different behavior. The bias check works
// because which color plays which role is randomized every trial and explicitly balanced: each
// color is the correct answer exactly REPS_PER_CELL times per condition per palette. If a palette
// is truly equal-salience, accuracy and confidence should not depend on which color happened to
// be correct, once pooled across that balanced design; if one color is more salient (as
// `current`'s CAM16-uncontrolled luminance predicts -- see palette-review-final.html, whose
// recommendedBackground() finds no single background equalizes `current`'s contrast at all:
// 0.04-0.87 even at its best background), trials where THAT color is correct should read out as
// higher accuracy/confidence, and trials where it's a distractor should pull accuracy down.
// Not part of the main experiment/CSV schema -- open palette-bias-pilot.html directly.
const PALETTES = {
  current: {
    colors: { red: '#FF0000', green: '#00FF00', blue: '#0000FF', yellow: '#FFFF00' },
    keys: { red: 'h', green: 'j', blue: 'k', yellow: 'l' },
    background: '#494949', // best available for `current`; still not equal-contrast (see above)
  },
  eq4: {
    colors: { orange: '#D78426', green: '#56B16E', blue: '#40A4E4', magenta: '#CA79C4' },
    keys: { orange: 'h', green: 'j', blue: 'k', magenta: 'l' },
    background: '#3B3B3B', // recommended background, contrast 0.75 (see colors.js/README)
  },
};
// the project's real 4-choice conditions (conditions.js / README), spanning easy to hard --
// hardcoded here rather than depending on conditions.js, same standalone convention as the other
// pilots (duration_pilot.js, woto_pilot.js)
const CONDITIONS_4CHOICE = [
  [100, 60, 60, 60], // easy
  [100, 70, 70, 40],
  [100, 70, 55, 55],
  [100, 80, 50, 50],
  [100, 80, 65, 35], // hard
];
const STIMULUS_DURATION = 500; // the study's baseline/no-noise duration, so only palette varies
const REPS_PER_CELL = 6; // 5 conditions x 4 target colors x 6 reps = 120 trials/palette (240 total)

// each color is forced to be the correct answer exactly REPS_PER_CELL times per condition per
// palette (colors[0] always the balanced target); the other three colors fill the remaining
// count-rank positions in random order, so no color is systematically stuck as e.g. the runner-up
function buildBiasTrials() {
  const rng = mulberry32(Date.now() >>> 0);
  const trials = [];
  Object.keys(PALETTES).forEach(palette => {
    const names = Object.keys(PALETTES[palette].colors);
    CONDITIONS_4CHOICE.forEach(counts => {
      names.forEach(targetColor => {
        for (let i = 0; i < REPS_PER_CELL; i++) {
          const others = shuffle(names.filter(c => c !== targetColor), rng);
          trials.push({
            palette, colors: [targetColor, ...others], counts: counts.slice(),
            correct_color: targetColor, duration: STIMULUS_DURATION,
          });
        }
      });
    });
  });
  return shuffle(trials, rng); // interleaves both palettes, every condition and target color
}

// same virtual-chinrest setup as the other standalone pilots, duplicated rather than pulling in
// session_flow.js for one trial
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

// swaps ACTIVE_COLORS (colors.js, a `let`) and the page background to this trial's palette before
// it draws -- deliberately NOT touching the shared COLOR_KEYS constant (config.js), since two
// palettes need two different key maps here; this pilot draws its own legend/reads its own key map
// (trial.keysMap) instead of relying on that global at all
function paletteSetupTrial(trial) {
  return {
    type: jsPsychCallFunction,
    func: function () {
      ACTIVE_COLORS = PALETTES[trial.palette].colors;
      document.getElementById('jspsych-target').style.backgroundColor = PALETTES[trial.palette].background;
    },
    data: { phase: 'palette_setup' },
  };
}

function drawBiasLegend(canvas, colors, keysMap) {
  const ctx = canvas.getContext('2d');
  const [cx, cy] = canvasCenter(canvas);
  const pxPerDeg = getPxPerDeg();
  const legendXDeg = [-9, -3, 3, 9].map(x => x * VISUAL_ANGLE_SCALE);
  const rectWidthPx = 4 * VISUAL_ANGLE_SCALE * pxPerDeg;
  const rectHeightPx = 3 * VISUAL_ANGLE_SCALE * pxPerDeg;
  const yOffsetDeg = 5 * VISUAL_ANGLE_SCALE;

  colors.forEach((color, i) => {
    const x = cx + legendXDeg[i] * pxPerDeg;
    const y = cy + yOffsetDeg * pxPerDeg;
    ctx.fillStyle = ACTIVE_COLORS[color];
    ctx.strokeStyle = 'white';
    ctx.fillRect(x - rectWidthPx / 2, y - rectHeightPx / 2, rectWidthPx, rectHeightPx);
    ctx.strokeRect(x - rectWidthPx / 2, y - rectHeightPx / 2, rectWidthPx, rectHeightPx);
    ctx.fillStyle = 'black';
    ctx.font = `bold ${20 * VISUAL_ANGLE_SCALE}px Avenir Next, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(keysMap[color].toUpperCase(), x, y);
  });
}

// real accuracy scoring against trial.correct_color -- self-contained rather than reusing
// makeDecisionTrial, since that reads the shared COLOR_KEYS constant this pilot deliberately
// avoids mutating (see paletteSetupTrial above)
function makeBiasDecisionTrial(trial, result) {
  const keysMap = PALETTES[trial.palette].keys;
  const validKeys = trial.colors.map(c => keysMap[c]);
  return {
    type: jsPsychCanvasKeyboardResponse,
    canvas_size: getCanvasSize,
    stimulus: function (canvas) {
      drawPrompt(canvas, 'Which color had the most dots?');
      drawBiasLegend(canvas, trial.colors, keysMap);
    },
    choices: validKeys,
    data: { phase: 'bias_decision' },
    on_finish: function (data) {
      const respColor = Object.keys(keysMap).find(c => keysMap[c] === data.response);
      result.resp = respColor;
      result.acc = respColor === trial.correct_color ? 1 : 0;
      result.rt = data.rt / 1000;
    },
  };
}

// no feedback, mirroring the main experiment's own main-trial convention (see buildMainTimeline
// in session_flow.js) -- this is the researcher running themself
function buildBiasTimeline(trials, rows) {
  const nodes = [];
  trials.forEach(trial => {
    const result = {};
    nodes.push(
      paletteSetupTrial(trial),
      makeFixationTrial(),
      makeStimulusTrial(trial),
      makeBiasDecisionTrial(trial, result),
      makeConfidenceTrial(result, function () { rows.push({ ...trial, ...result }); }),
    );
  });
  return nodes;
}

const BIAS_CSV_HEADER = 'palette,colors,counts,correct_color,resp,acc,rt,conf,c_rt';

function biasRowToCsvLine(row) {
  const fields = [
    row.palette, `[${row.colors.join(',')}]`, `[${row.counts.join(',')}]`, row.correct_color,
    row.resp, row.acc, row.rt, row.conf, row.c_rt,
  ];
  return fields.map(csvField).join(',');
}

function pilotInstructionsTrial() {
  const total = Object.keys(PALETTES).length * CONDITIONS_4CHOICE.length * 4 * REPS_PER_CELL;
  return {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `
      <div style="font-size:1.4em; max-width:640px;">
        <p>Palette bias pilot: same task as the main experiment (most-numerous color, HJKL
        keys, 1-4 confidence). Two palettes, five difficulty conditions each, interleaved,
        ${total} trials total, no feedback, no practice.</p>
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
        const csvText = BIAS_CSV_HEADER + '\n' + rows.map(biasRowToCsvLine).join('\n');
        const now = new Date();
        downloadCsvText(`palette_bias_pilot_${formatDate(now)}_${formatTime(now)}.csv`, csvText);
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
const biasTrials = buildBiasTrials();
const biasRows = [];

jsPsych.run([
  { type: jsPsychFullscreen, fullscreen_mode: true },
  pilotChinrestTrial(),
  pilotInstructionsTrial(),
  ...buildBiasTimeline(biasTrials, biasRows),
  pilotDownloadTrial(biasRows),
]);
