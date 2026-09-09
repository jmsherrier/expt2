// preview illustrations are rendered at PREVIEW_SCALE of the REAL on-screen stimulus/legend size,
// reusing the actual degree-based sizes (APERTURE_RADIUS_DEG, DOT_RADIUS_DEG, drawColorLegend's
// layout) converted through this session's real pxPerDeg -- available here because these screens
// run after the virtual chinrest. rendered at PREVIEW_SUPERSAMPLE x the target size and displayed
// at 1/PREVIEW_SUPERSAMPLE via the <img> width (see buildStimulusPreviewScreen below) so the image
// stays crisp on high-DPI screens
const PREVIEW_GAIN = 0.75;
const PREVIEW_SCALE = 0.6;
const PREVIEW_SUPERSAMPLE = 2;

// renders a drawing function onto an offscreen canvas and returns it as a data URL, for embedding
// as a static <img> inside instruction HTML
function renderPreviewImage(widthPx, heightPx, drawFn) {
  const canvas = document.createElement('canvas');
  canvas.width = widthPx;
  canvas.height = heightPx;
  drawFn(canvas.getContext('2d'), widthPx / 2, heightPx / 2);
  return canvas.toDataURL();
}

// example dot cloud at a fixed 75% luminance for all four colors -- same dot cloud generator
// (buildCalibrationDotCloud) and real degree-based sizes as the actual calibration stimulus, just
// scaled down to PREVIEW_SCALE of its real on-screen size
function drawStimulusPreview(ctx, cx, cy) {
  const gains = { red: PREVIEW_GAIN, green: PREVIEW_GAIN, blue: PREVIEW_GAIN, yellow: PREVIEW_GAIN };
  const gainedColors = getGainedColors(gains);
  const pxPerDeg = getPxPerDeg() * PREVIEW_SCALE * PREVIEW_SUPERSAMPLE;
  const dotRadiusPx = DOT_RADIUS_DEG * pxPerDeg;

  buildCalibrationDotCloud(CALIBRATION_DOTS_PER_COLOR).forEach(dot => {
    ctx.beginPath();
    ctx.arc(cx + dot.pos[0] * pxPerDeg, cy - dot.pos[1] * pxPerDeg, dotRadiusPx, 0, 2 * Math.PI);
    ctx.fillStyle = gainedColors[dot.color];
    ctx.fill();
  });
}

// builds the stimulus-example instruction screen's HTML at trial runtime (not timeline-build
// time), since getPxPerDeg() only resolves after the virtual chinrest trial has actually run --
// passed to jsPsych as a stimulus function, evaluated when this trial starts
function buildStimulusPreviewScreen() {
  const pxPerDeg = getPxPerDeg() * PREVIEW_SCALE * PREVIEW_SUPERSAMPLE;
  const nativePx = Math.ceil(2 * APERTURE_RADIUS_DEG * pxPerDeg + 20);
  const imgSrc = renderPreviewImage(nativePx, nativePx, drawStimulusPreview);
  return buildColorCalibrationStimulusText(imgSrc, nativePx / PREVIEW_SUPERSAMPLE);
}

// final per-color gain is the average of the confirmed slider settings across every rep
function computeAverageGains(repGains) {
  const sums = { red: 0, green: 0, blue: 0, yellow: 0 };
  repGains.forEach(g => COLOR_NAMES.forEach(c => { sums[c] += g[c]; }));
  const n = repGains.length;
  const avg = {};
  COLOR_NAMES.forEach(c => { avg[c] = sums[c] / n; });
  return avg;
}

function buildColorTrialInfo(gains, subjectId, seed, trialIndex) {
  const now = new Date();
  return {
    date: formatDate(now), time: formatTime(now),
    sid: subjectId, seed: seed, trial: trialIndex,
    gain_red: gains.red, gain_green: gains.green, gain_blue: gains.blue, gain_yellow: gains.yellow,
  };
}

function colorRowToCsvLine(row) {
  const fields = [
    row.date, row.time, row.sid, row.seed, row.trial,
    row.gain_red, row.gain_green, row.gain_blue, row.gain_yellow,
  ];
  return fields.map(csvField).join(',');
}

// re-posts the whole accumulated calibration history after every rep, overwriting the file in
// place server-side -- same crash-safe philosophy as saveSessionData. enqueueSave (expt_util.js)
// adds retry-with-backoff and write-ordering, and shares its lastSaveOk/beforeunload guard with
// the main session data saves
function saveColorData(subjectId, rows) {
  const csvText = COLOR_CSV_HEADER + '\n' + rows.map(colorRowToCsvLine).join('\n');
  return enqueueSave('save_color.php', { subject_id: subjectId, csv: csvText });
}

// rebuilds calibration state from this subject's saved _COLOR.csv rows (empty array if the file
// doesn't exist yet): each row is one confirmed rep, complete once N_COLOR_CALIBRATION_REPS have
// been recorded -- crash-safe, mirrors how resolveSessionPlan resumes a partially-saved session
function deriveColorCalibrationState(colorRows) {
  if (!colorRows.length) {
    return { complete: false, gains: { ...DEFAULT_COLOR_GAINS }, repGains: [], rows: [], trialIndex: 0 };
  }

  const repGains = colorRows.map(r => ({
    red: Number(r.gain_red), green: Number(r.gain_green), blue: Number(r.gain_blue), yellow: Number(r.gain_yellow),
  }));
  const complete = repGains.length >= N_COLOR_CALIBRATION_REPS;

  return {
    complete,
    gains: complete ? computeAverageGains(repGains) : { ...DEFAULT_COLOR_GAINS },
    repGains,
    rows: colorRows,
    trialIndex: colorRows.length,
  };
}

// canvas is sized to exactly fit the aperture (not the full window, unlike the main task's
// stimulus canvas), since it sits alongside the slider sidebar rather than filling the screen
function calibrationCanvasSizePx() {
  const pxPerDeg = getPxPerDeg();
  return Math.ceil(2 * APERTURE_RADIUS_DEG * pxPerDeg + 20);
}

// dot cloud canvas on the left, one labeled range slider per color plus a Confirm button on the
// right -- built as a plain HTML string (like every other jsPsych trial in this codebase), wired
// up via on_load in makeCalibrationRepTrial below
function buildCalibrationTrialHtml() {
  const canvasSizePx = calibrationCanvasSizePx();
  const sliderRows = COLOR_NAMES.map(color => `
    <div style="display:flex; flex-direction:column; margin-bottom:20px; width:240px;">
      <label for="calib-slider-${color}" style="text-transform:capitalize; font-weight:bold; margin-bottom:4px;">${color}</label>
      <input type="range" id="calib-slider-${color}" min="${CALIBRATION_FLOOR}" max="1" step="0.01">
    </div>
  `).join('');

  return `
    <div style="display:flex; align-items:center; justify-content:center; gap:60px;">
      <canvas id="calib-canvas" width="${canvasSizePx}" height="${canvasSizePx}"></canvas>
      <div style="display:flex; flex-direction:column; align-items:flex-start;">
        <p style="font-size:1.2em; margin-bottom:16px; max-width:280px;">Adjust each slider until no one color looks more salient than the others.</p>
        ${sliderRows}
        <button id="calib-confirm-btn" style="font-size:1.1em; padding:8px 24px; margin-top:8px; align-self:center;">Confirm</button>
      </div>
    </div>
  `;
}

// one calibration rep: dot positions are generated once (on_load) and never move again this rep --
// only their rendered color updates as sliders are dragged, since repositioning dots on every
// 'input' event would both be slow (rejection-sampled placement) and make brightness harder to
// judge. sliders start at an independent random position per color per rep, so nothing anchors on
// a previous rep's settings. Confirm calls jsPsych.finishTrial directly (this codebase's plugins
// already reference the global `jsPsych` instance elsewhere, e.g. getPxPerDeg's jsPsych.data.get())
// since html-keyboard-response with choices:'NO_KEYS' and no trial_duration otherwise never ends
function makeCalibrationRepTrial(calibState, subjectId, seed) {
  return {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: buildCalibrationTrialHtml,
    choices: 'NO_KEYS',
    data: { phase: 'color_calibration' },
    on_load: function () {
      const dotCloud = buildCalibrationDotCloud(CALIBRATION_DOTS_PER_COLOR);
      const gains = {};
      COLOR_NAMES.forEach(c => { gains[c] = CALIBRATION_FLOOR + Math.random() * (1 - CALIBRATION_FLOOR); });

      const canvas = document.getElementById('calib-canvas');
      const redraw = function () { drawCalibrationStimulus(canvas, dotCloud, gains); };

      COLOR_NAMES.forEach(color => {
        const slider = document.getElementById(`calib-slider-${color}`);
        slider.value = gains[color];
        slider.addEventListener('input', function () {
          gains[color] = Number(slider.value);
          redraw();
        });
      });
      redraw();

      document.getElementById('calib-confirm-btn').addEventListener('click', function () {
        jsPsych.finishTrial({ gains: { ...gains } });
      });
    },
    on_finish: function (data) {
      calibState.trialIndex += 1;
      calibState.repGains.push({ ...data.gains });
      calibState.rows.push(buildColorTrialInfo(data.gains, subjectId, seed, calibState.trialIndex));
      saveColorData(subjectId, calibState.rows);
    },
  };
}

// two-page calibration walkthrough (stimulus example, then task/slider explanation) shown before
// the matching reps begin. pages is a function (not a precomputed array) so it renders at trial
// runtime, once getPxPerDeg() actually resolves from the virtual chinrest trial that precedes this
// timeline -- same jsPsychInstructions plugin, and the same mouse (show_clickable_nav) + Left/Right
// arrow key navigation, as mainInstructionsTrial() in main_instructions.js
function calibrationInstructionsTrial() {
  return {
    type: jsPsychInstructions,
    pages: function () { return [buildStimulusPreviewScreen(), buildColorCalibrationMappingText()]; },
    show_clickable_nav: true,
    allow_backward: true,
    key_forward: 'ArrowRight',
    key_backward: 'ArrowLeft',
    data: { phase: 'color_calibration_instructions' },
  };
}

// runs (or resumes) N_COLOR_CALIBRATION_REPS matching reps, each preceded by its own fixation
// (same Fixation -> Stimulus convention as every other trial in this codebase), then averages the
// recorded per-rep gains into the final per-color gain and activates it
function buildColorCalibrationTimeline(calibState, subjectId, seed) {
  const timeline = [];
  timeline.push(calibrationInstructionsTrial());

  timeline.push({
    timeline: [makeFixationTrial(), makeCalibrationRepTrial(calibState, subjectId, seed)],
    loop_function: function () { return calibState.trialIndex < N_COLOR_CALIBRATION_REPS; },
  });

  timeline.push({
    type: jsPsychCallFunction,
    func: function () {
      calibState.gains = computeAverageGains(calibState.repGains);
      calibState.complete = true;
      setActiveColors(calibState.gains);
    },
  });

  return timeline;
}
