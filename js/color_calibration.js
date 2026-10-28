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
  const gains = { orange: PREVIEW_GAIN, green: PREVIEW_GAIN, blue: PREVIEW_GAIN, magenta: PREVIEW_GAIN };
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

function buildColorTrialInfo(gains, subjectId, seed, trialIndex) {
  const now = new Date();
  return {
    date: formatDate(now), time: formatTime(now),
    sid: subjectId, seed: seed, trial: trialIndex,
    gain_orange: gains.orange, gain_green: gains.green, gain_blue: gains.blue, gain_magenta: gains.magenta,
  };
}

function colorRowToCsvLine(row) {
  const fields = [
    row.date, row.time, row.sid, row.seed, row.trial,
    row.gain_orange, row.gain_green, row.gain_blue, row.gain_magenta,
  ];
  return fields.map(csvField).join(',');
}

// re-posts the whole accumulated calibration history after every rep, overwriting the file in
// place server-side -- same crash-safe philosophy as saveSessionData. enqueueSave (expt_util.js)
// adds retry-with-backoff and write-ordering, and shares its lastSaveOk/beforeunload guard with
// the main session data saves
function saveColorData(subjectId, rows) {
  if (!serverAvailable) return Promise.resolve();
  const csvText = COLOR_CSV_HEADER + '\n' + rows.map(colorRowToCsvLine).join('\n');
  return enqueueSave('save_color.php', { subject_id: subjectId, prefix: DATA_PREFIX, csv: csvText });
}

// rebuilds calibration state from this subject's saved _color.csv rows (empty array if the file
// doesn't exist yet): one row per confirmed screen -- CALIBRATION_PAIR_COLORS pairwise screens, then
// the all-colors screen, then the refinement. The latest row's gains are the current gains, and
// once all N_CALIBRATION_SCREENS rows exist they're final -- crash-safe, mirrors how
// resolveSessionPlan resumes a partially-saved session
function deriveColorCalibrationState(colorRows) {
  if (!colorRows.length) {
    return { complete: false, gains: { ...DEFAULT_COLOR_GAINS }, repGains: [], rows: [], trialIndex: 0 };
  }

  const repGains = colorRows.map(r => ({
    orange: Number(r.gain_orange), green: Number(r.gain_green), blue: Number(r.gain_blue), magenta: Number(r.gain_magenta),
  }));

  return {
    complete: repGains.length >= N_CALIBRATION_SCREENS,
    gains: { ...repGains[repGains.length - 1] },
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

// dot cloud canvas on the left, one labeled range slider per shown color plus a Confirm button on
// the right -- green's slider is shown at its fixed value but disabled, so it reads as the reference
function buildCalibrationTrialHtml(colors) {
  const canvasSizePx = calibrationCanvasSizePx();
  const sliderRows = colors.map(color => `
    <div style="display:flex; flex-direction:column; margin-bottom:20px; width:240px;">
      <label for="calib-slider-${color}" style="font-weight:bold; margin-bottom:4px;">${capitalizeColorName(color)}${color === 'green' ? ' (fixed)' : ''}</label>
      <input type="range" id="calib-slider-${color}" min="${CALIBRATION_MIN}" max="${CALIBRATION_MAX}" step="0.01"${color === 'green' ? ' disabled' : ''}>
    </div>
  `).join('');
  const prompt = colors.length === 2
    ? `Adjust the ${capitalizeColorName(colors[1])} slider until neither color looks more noticeable than the other.`
    : 'Adjust the sliders until no one color looks more noticeable than the others.';

  return `
    <div style="display:flex; align-items:center; justify-content:center; gap:60px;">
      <canvas id="calib-canvas" width="${canvasSizePx}" height="${canvasSizePx}"></canvas>
      <div style="display:flex; flex-direction:column; align-items:flex-start;">
        <p style="font-size:1.2em; margin-bottom:16px; max-width:280px;">${prompt}</p>
        ${sliderRows}
        <button id="calib-confirm-btn" style="font-size:1.1em; padding:8px 24px; margin-top:8px; align-self:center;">Confirm</button>
      </div>
    </div>
  `;
}

// one calibration screen showing only `colors` (green plus one color in step 1, all four in step
// 2). Dot positions are generated once (on_load) and never move again -- only their rendered color
// updates as sliders are dragged. Colors in randomStart begin at a random slider position so
// nothing anchors the match; every other color starts at its current gain (calibState.gains), and
// green is always GREEN_FIXED_GAIN. Confirm calls jsPsych.finishTrial directly, since
// html-keyboard-response with choices:'NO_KEYS' never ends on its own
function makeCalibrationRepTrial(calibState, subjectId, seed, colors, randomStart) {
  return {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: () => buildCalibrationTrialHtml(colors),
    choices: 'NO_KEYS',
    data: { phase: 'color_calibration' },
    on_load: function () {
      const dotCloud = buildCalibrationDotCloud(CALIBRATION_DOTS_PER_COLOR, colors);
      const gains = { ...calibState.gains, green: GREEN_FIXED_GAIN };
      randomStart.forEach(c => { gains[c] = CALIBRATION_MIN + Math.random() * (CALIBRATION_MAX - CALIBRATION_MIN); });

      const canvas = document.getElementById('calib-canvas');
      const redraw = function () { drawCalibrationStimulus(canvas, dotCloud, gains); };

      colors.forEach(color => {
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
      calibState.gains = { ...data.gains };
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

// one brief equal-count dot cloud at the current gains: no response, just a look
function makeCalibrationCheckTrial(calibState) {
  return {
    type: jsPsychCanvasKeyboardResponse,
    canvas_size: getCanvasSize,
    stimulus: function (canvas) {
      drawCalibrationStimulus(canvas, buildCalibrationDotCloud(CALIBRATION_DOTS_PER_COLOR), calibState.gains);
    },
    choices: 'NO_KEYS',
    trial_duration: CALIBRATION_CHECK_MS,
    data: { phase: 'color_calibration_check' },
  };
}

// step 1: one pairwise screen per CALIBRATION_PAIR_COLORS color against fixed green. step 2: all
// four colors (starting at the step-1 values), a few brief equal-count clouds at those gains so the
// subject can judge whether any color stands out or fades, then one refinement screen whose values
// are final. Each screen runs only if it's the next unsaved one (calibState.trialIndex), so a
// resumed session picks up where it left off. Every stimulus gets its own fixation, same
// Fixation -> Stimulus convention as the rest of the experiment.
function buildColorCalibrationTimeline(calibState, subjectId, seed) {
  const timeline = [calibrationInstructionsTrial()];
  const ifNext = (k, nodes) => ({ timeline: nodes, conditional_function: () => calibState.trialIndex === k });

  CALIBRATION_PAIR_COLORS.forEach((color, k) => {
    timeline.push(ifNext(k, [makeFixationTrial(), makeCalibrationRepTrial(calibState, subjectId, seed, ['green', color], [color])]));
  });

  const allIndex = CALIBRATION_PAIR_COLORS.length;
  timeline.push(ifNext(allIndex, [makeFixationTrial(), makeCalibrationRepTrial(calibState, subjectId, seed, COLOR_NAMES, [])]));

  const checkAndRefine = [{ type: jsPsychHtmlKeyboardResponse, stimulus: CALIBRATION_CHECK_TEXT, choices: [' '] }];
  for (let i = 0; i < CALIBRATION_CHECK_STIMULI; i++) {
    checkAndRefine.push(makeFixationTrial(), makeCalibrationCheckTrial(calibState));
  }
  checkAndRefine.push(
    { type: jsPsychHtmlKeyboardResponse, stimulus: CALIBRATION_REFINE_TEXT, choices: [' '] },
    makeFixationTrial(),
    makeCalibrationRepTrial(calibState, subjectId, seed, COLOR_NAMES, []),
  );
  timeline.push(ifNext(allIndex + 1, checkAndRefine));

  timeline.push({
    type: jsPsychCallFunction,
    func: function () {
      calibState.complete = true;
      setActiveColors(calibState.gains);
    },
  });

  return timeline;
}
