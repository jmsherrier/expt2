// Standalone single-subject pilot: does Equiluminant 4 actually produce a flatter (less biased)
// response distribution than the old full-saturation palette? Every trial here shows the SAME
// dot count for all four colors -- there is no correct answer, so whichever color a subject
// reports as "most numerous" is pure response bias (perceptual salience + any motor key habit,
// since both use the real experiment's fixed HJKL mapping, same as the main task would). If a
// palette is truly equal-salience, its response counts should land near 25% per color; if one
// color reads as more salient (as `current`'s CAM16-uncontrolled luminance predicts -- see
// palette-review-final.html, whose recommendedBackground() finds no background gives `current`
// equal contrast at all: contrast ranges 0.04-0.87 even at its best background), that color
// should be over-picked. Not part of the main experiment/CSV schema -- open
// palette-bias-pilot.html directly.
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
const DOTS_PER_COLOR = 25;
const STIMULUS_DURATION = 500; // the study's baseline/no-noise duration, so only palette varies
const TRIALS_PER_PALETTE = 100; // 200 total, ~15 min -- power for a medium bias (Cohen's w~0.3, df=3)

// makeConfidenceTrial/makePauseableTrial (expt_util.js) read these -- unused here (no confidence
// trial in this pilot) but harmless to define for consistency with the other standalone pilots
const pauseRequested = false;
const pauseActive = false;
function setPauseHintVisible() {}

function buildBiasTrials() {
  const rng = mulberry32(Date.now() >>> 0);
  const trials = [];
  Object.keys(PALETTES).forEach(palette => {
    const names = Object.keys(PALETTES[palette].colors);
    for (let i = 0; i < TRIALS_PER_PALETTE; i++) {
      trials.push({ palette, colors: names, counts: names.map(() => DOTS_PER_COLOR), duration: STIMULUS_DURATION });
    }
  });
  return shuffle(trials, rng); // interleaves both palettes trial-by-trial
}

// same virtual-chinrest setup as the other standalone pilots, duplicated rather than pulling in
// session_flow.js for one trial
function pilotChinrestTrial() {
  return {
    type: jsPsychVirtualChinrest,
    blindspot_reps: 3,
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

// no correct answer on these trials (every color has the same count) -- this records which
// color was picked and how long it took, nothing else. Self-contained rather than reusing
// makeDecisionTrial, since that reads the shared COLOR_KEYS constant this pilot deliberately
// avoids mutating (see paletteSetupTrial above)
function makeBiasDecisionTrial(trial, rows) {
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
      const resp = Object.keys(keysMap).find(c => keysMap[c] === data.response);
      rows.push({ palette: trial.palette, colors: trial.colors, counts: trial.counts, resp, rt: data.rt / 1000 });
    },
  };
}

function buildBiasTimeline(trials, rows) {
  const nodes = [];
  trials.forEach(trial => {
    nodes.push(
      paletteSetupTrial(trial),
      makeFixationTrial(),
      makeStimulusTrial(trial),
      makeBiasDecisionTrial(trial, rows),
    );
  });
  return nodes;
}

const BIAS_CSV_HEADER = 'palette,colors,counts,resp,rt';

function biasRowToCsvLine(row) {
  const fields = [row.palette, `[${row.colors.join(',')}]`, `[${row.counts.join(',')}]`, row.resp, row.rt];
  return fields.map(csvField).join(',');
}

function pilotInstructionsTrial() {
  return {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `
      <div style="font-size:1.4em; max-width:640px;">
        <p>Palette bias pilot: every trial shows the same number of dots of every color --
        there's no correct answer. Just press the key (H/J/K/L) for whichever color looks like
        it has the most dots, as fast as feels natural. ${TRIALS_PER_PALETTE * 2} trials, two
        palettes interleaved, no feedback.</p>
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

const jsPsych = initJsPsych({ display_element: 'jspsych-target' });
const biasTrials = buildBiasTrials();
const biasRows = [];

jsPsych.run([
  { type: jsPsychFullscreen, fullscreen_mode: true },
  pilotChinrestTrial(),
  pilotInstructionsTrial(),
  ...buildBiasTimeline(biasTrials, biasRows),
  pilotDownloadTrial(biasRows),
]);
