// tracks the most recent save request so the session-complete screen can wait for the real
// upload to finish, instead of a fixed timer disconnected from the actual network call -- shared
// by session_flow.js (main/practice data) and color_calibration.js (calibration data)
let lastSaveResponse = Promise.resolve();

// true only once the newest queued save has been confirmed by the server -- false from the moment
// any save starts until it (or a retry of it) actually succeeds, so a save that's mid-retry or has
// exhausted every retry both correctly read as "not safely saved yet"
let lastSaveOk = true;

// warns before the tab/window closes while the latest save hasn't been confirmed -- browsers
// replace any custom message with their own generic prompt, but the listener has to call
// preventDefault/set returnValue for that prompt to appear at all
window.addEventListener('beforeunload', function (e) {
  if (!lastSaveOk) {
    e.preventDefault();
    e.returnValue = '';
  }
});

// posts JSON to url, retrying transient failures (network errors, or non-2xx responses -- a bare
// fetch never rejects on e.g. a 500, so response.ok has to be checked by hand) with exponential
// backoff. only rejects once every retry is exhausted, so a caller seeing this reject means the
// server truly never accepted the save, not just a single dropped request
async function postJsonWithRetry(url, payload, maxRetries = 4, baseDelayMs = 1000) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`save request to ${url} failed with status ${res.status}`);
      const body = await res.text();
      try {
        return JSON.parse(body);
      } catch (error) {
        if (!['localhost', '127.0.0.1'].includes(location.hostname)) throw error;
        return { ok: true, staticTest: true };
      }
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, baseDelayMs * 2 ** attempt));
      }
    }
  }
  throw lastError;
}

// single shared write queue for every save endpoint (save.php and save_color.php) -- each call is
// chained after the previous one instead of firing immediately, so two saves in flight can never
// finish out of order and have the smaller/older payload overwrite the larger/newer one on disk.
// also the one place lastSaveOk/lastSaveResponse get updated, so both save.php and save_color.php
// share the same beforeunload guard and session-complete success check
let saveQueue = Promise.resolve();

function enqueueSave(url, payload) {
  lastSaveOk = false;
  const attempt = saveQueue.then(() => postJsonWithRetry(url, payload));
  saveQueue = attempt.then(() => {}, () => {});
  lastSaveResponse = attempt.then(
    result => { lastSaveOk = true; return result; },
    err => { lastSaveOk = false; throw err; },
  );
  return lastSaveResponse;
}

// triggers a browser download of csvText as filename -- the local backup copy prompted at the end
// of every session, independent of whether the server-side save (save.php, via enqueueSave above)
// actually succeeded
function downloadCsvText(filename, csvText) {
  const blob = new Blob([csvText], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function csvField(value) {
  const str = String(value);
  return str.includes(',') ? `"${str}"` : str;
}

function formatDate(d) {
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

function formatTime(d) {
  const pad = n => String(n).padStart(2, '0');
  return `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

// px-per-degree from this session's virtual-chinrest calibration, looked up once and cached --
// unlike the template's bug of leaving stimulus size in fixed pixels, every degree-based size in
// this file is converted through this value
let cachedPxPerDeg = null;

function getPxPerDeg() {
  if (cachedPxPerDeg === null) {
    const chinrestData = jsPsych.data.get().filter({ trial_type: 'virtual-chinrest' });
    cachedPxPerDeg = parseFloat(chinrestData.select('px2deg').values[0]);
  }
  return cachedPxPerDeg;
}

// jsPsych's canvas-keyboard-response plugin takes canvas_size as [height, width], not
// [width, height] -- easy to get backwards, and doing so silently draws a transposed canvas
function getCanvasSize() {
  return [window.innerHeight, window.innerWidth];
}

function canvasCenter(canvas) {
  return [canvas.width / 2, canvas.height / 2];
}

// two concentric outlined circles, same shape as the pilot's fixation
function drawFixation(canvas) {
  const ctx = canvas.getContext('2d');
  const [cx, cy] = canvasCenter(canvas);
  const pxPerDeg = getPxPerDeg();
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 4;
  [0.25, 0.5].forEach(rDeg => {
    ctx.beginPath();
    ctx.arc(cx, cy, rDeg * VISUAL_ANGLE_SCALE * pxPerDeg, 0, 2 * Math.PI);
    ctx.stroke();
  });
}

// draws this trial's dot cloud, converting degrees to pixels via this session's calibration
function drawStimulus(canvas, trial) {
  const ctx = canvas.getContext('2d');
  const [cx, cy] = canvasCenter(canvas);
  const pxPerDeg = getPxPerDeg();
  const dotRadiusPx = DOT_RADIUS_DEG * pxPerDeg;

  buildDotCloud(trial).forEach(dot => {
    const x = cx + dot.pos[0] * pxPerDeg;
    const y = cy - dot.pos[1] * pxPerDeg;
    ctx.beginPath();
    ctx.arc(x, y, dotRadiusPx, 0, 2 * Math.PI);
    ctx.fillStyle = ACTIVE_COLORS[dot.color];
    ctx.fill();
  });
}

// fixed dot count keeps the mask from revealing the numerosity of the stimulus that preceded it;
// fresh positions and uniformly sampled colors make the flash non-diagnostic on every trial
function drawMask(canvas) {
  const ctx = canvas.getContext('2d');
  const [cx, cy] = canvasCenter(canvas);
  const pxPerDeg = getPxPerDeg();
  const dotRadiusPx = DOT_RADIUS_DEG * pxPerDeg;
  const colors = Object.keys(ACTIVE_COLORS);

  generateDotPositions(MASK_N_DOTS, APERTURE_RADIUS_DEG, DOT_RADIUS_DEG).forEach(pos => {
    ctx.beginPath();
    ctx.arc(cx + pos[0] * pxPerDeg, cy - pos[1] * pxPerDeg, dotRadiusPx, 0, 2 * Math.PI);
    ctx.fillStyle = ACTIVE_COLORS[colors[Math.floor(Math.random() * colors.length)]];
    ctx.fill();
  });
}

// dedicated dot-cloud builder for the color-calibration task: a fixed 4-color, equal-N cloud.
// returns color labels (not baked-in hex) so a caller can redraw the same fixed positions at
// different gains -- e.g. color_calibration.js's sliders redraw live while dragging without
// re-running rejection sampling on every 'input' event
function buildCalibrationDotCloud(nDotsPerColor) {
  const nTotal = nDotsPerColor * COLOR_NAMES.length;
  const positions = generateDotPositions(nTotal, APERTURE_RADIUS_DEG, DOT_RADIUS_DEG);

  const colorLabels = [];
  COLOR_NAMES.forEach(color => { for (let j = 0; j < nDotsPerColor; j++) colorLabels.push(color); });
  shuffle(colorLabels, Math.random);

  return positions.map((pos, i) => ({ pos, color: colorLabels[i] }));
}

// redraws a calibration dot cloud (fixed positions/labels from buildCalibrationDotCloud) at the
// given gains -- called on every slider drag, so this only recolors, it never re-places dots
function drawCalibrationStimulus(canvas, dotCloud, gains) {
  const ctx = canvas.getContext('2d');
  const [cx, cy] = canvasCenter(canvas);
  const pxPerDeg = getPxPerDeg();
  const dotRadiusPx = DOT_RADIUS_DEG * pxPerDeg;
  const gainedColors = getGainedColors(gains);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  dotCloud.forEach(dot => {
    const x = cx + dot.pos[0] * pxPerDeg;
    const y = cy - dot.pos[1] * pxPerDeg;
    ctx.beginPath();
    ctx.arc(x, y, dotRadiusPx, 0, 2 * Math.PI);
    ctx.fillStyle = gainedColors[dot.color];
    ctx.fill();
  });
}

// yOffsetDeg is how far ABOVE center the text sits -- default matches the decision/confidence
// trials, which never have a stimulus on screen at the same time. the calibration screen does, so
// it passes a larger offset to clear the dot cloud (see drawCalibrationStimulus)
function drawPrompt(canvas, text, yOffsetDeg = 4 * VISUAL_ANGLE_SCALE) {
  const ctx = canvas.getContext('2d');
  const [cx, cy] = canvasCenter(canvas);
  const pxPerDeg = getPxPerDeg();
  ctx.fillStyle = 'black';
  ctx.font = `${24 * VISUAL_ANGLE_SCALE}px Avenir Next, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(text, cx, cy - yOffsetDeg * pxPerDeg);
}

// grey fill for legend buttons whose color isn't a valid response this trial (2-choice and
// 3-choice trials don't use all 4 colors) -- keeps the button/key visible without revealing
// which colors are actually in play
const UNAVAILABLE_LEGEND_COLOR = '#999999';

// fixed color-key legend, same four rectangles every trial so the key mapping never has to be
// memorized -- all 4 buttons are always drawn, but only the colors present this trial (validColors)
// show their real color; the rest are greyed out. yOffsetDeg is how far BELOW center the row sits
// (default matches the decision trial, which has no stimulus on screen at the same time);
// colorMap defaults to the resolved ACTIVE_COLORS but the calibration screen passes this trial's
// own gained colors, since ACTIVE_COLORS isn't set until calibration finishes
function drawColorLegend(canvas, validColors, yOffsetDeg = 5 * VISUAL_ANGLE_SCALE, colorMap = ACTIVE_COLORS) {
  const ctx = canvas.getContext('2d');
  const [cx, cy] = canvasCenter(canvas);
  const pxPerDeg = getPxPerDeg();
  // .map scales each fixed legend x-position by the same visual-angle factor as everything else
  const legendXDeg = [-9, -3, 3, 9].map(x => x * VISUAL_ANGLE_SCALE);
  const rectWidthPx = 4 * VISUAL_ANGLE_SCALE * pxPerDeg;
  const rectHeightPx = 3 * VISUAL_ANGLE_SCALE * pxPerDeg;

  COLOR_NAMES.forEach((color, i) => {
    const x = cx + legendXDeg[i] * pxPerDeg;
    const y = cy + yOffsetDeg * pxPerDeg;

    ctx.fillStyle = validColors.includes(color) ? colorMap[color] : UNAVAILABLE_LEGEND_COLOR;
    ctx.strokeStyle = 'black';
    ctx.fillRect(x - rectWidthPx / 2, y - rectHeightPx / 2, rectWidthPx, rectHeightPx);
    ctx.strokeRect(x - rectWidthPx / 2, y - rectHeightPx / 2, rectWidthPx, rectHeightPx);

    ctx.fillStyle = 'black';
    ctx.font = `bold ${20 * VISUAL_ANGLE_SCALE}px Avenir Next, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(COLOR_KEYS[color].toUpperCase(), x, y);
  });
}

function drawFeedback(canvas, acc, correctColor) {
  const ctx = canvas.getContext('2d');
  const [cx, cy] = canvasCenter(canvas);
  ctx.fillStyle = acc ? '#00FF00' : '#FF0000';
  ctx.font = `bold ${72 * VISUAL_ANGLE_SCALE}px Avenir Next, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(acc ? 'O' : 'X', cx, cy);

  // wrong trials also state the correct color below the X, since accuracy feedback alone doesn't
  // tell the subject what they should have picked
  if (!acc) {
    drawPrompt(canvas, `The correct answer is ${capitalizeColorName(correctColor)}.`, -4 * VISUAL_ANGLE_SCALE);
  }
}

function makeFixationTrial() {
  return {
    type: jsPsychCanvasKeyboardResponse,
    canvas_size: getCanvasSize,
    stimulus: drawFixation,
    choices: 'NO_KEYS',
    trial_duration: 500,
    data: { phase: 'fixation' },
  };
}

function makeStimulusTrial(trial) {
  if (trial.duration === undefined) {
    throw new Error('stimulus trial is missing a duration');
  }

  return {
    type: jsPsychCanvasKeyboardResponse,
    canvas_size: getCanvasSize,
    stimulus: function (canvas) { drawStimulus(canvas, trial); },
    choices: 'NO_KEYS',
    trial_duration: trial.duration,
    data: { phase: 'stimulus' },
  };
}

function makeMaskTrial() {
  return {
    type: jsPsychCanvasKeyboardResponse,
    canvas_size: getCanvasSize,
    stimulus: drawMask,
    choices: 'NO_KEYS',
    trial_duration: MASK_DURATION,
    data: { phase: 'mask' },
  };
}

// only the colors actually shown in this trial are valid responses. `result` is a plain object
// shared with this trial's confidence/feedback nodes so they don't need to re-query jsPsych's own
// recorded data to find out what just happened
function makeDecisionTrial(trial, result) {
  const validKeys = trial.colors.map(c => COLOR_KEYS[c]);
  return {
    type: jsPsychCanvasKeyboardResponse,
    canvas_size: getCanvasSize,
    stimulus: function (canvas) {
      drawPrompt(canvas, 'Which color had the most dots?');
      drawColorLegend(canvas, trial.colors);
    },
    choices: validKeys,
    data: { phase: 'decision' },
    on_finish: function (data) {
      const respColor = Object.keys(COLOR_KEYS).find(c => COLOR_KEYS[c] === data.response);
      result.resp = respColor;
      result.acc = respColor === trial.correct_color ? 1 : 0;
      result.rt = data.rt / 1000;
    },
  };
}

function makeConfidenceTrial(result, onDone) {
  return {
    type: jsPsychCanvasKeyboardResponse,
    canvas_size: getCanvasSize,
    stimulus: function (canvas) { drawPrompt(canvas, 'How confident are you? (1 = low, 4 = high)'); },
    choices: CONFIDENCE_KEYS,
    data: { phase: 'confidence' },
    on_finish: function (data) {
      result.conf = Number(data.response);
      result.c_rt = data.rt / 1000;
      if (onDone) onDone();
    },
  };
}

function makeFeedbackTrial(trial, result) {
  return {
    type: jsPsychCanvasKeyboardResponse,
    canvas_size: getCanvasSize,
    stimulus: function (canvas) { drawFeedback(canvas, result.acc, trial.correct_color); },
    choices: 'NO_KEYS',
    trial_duration: 500,
    data: { phase: 'feedback' },
  };
}
