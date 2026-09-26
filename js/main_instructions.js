// multi-page main-task instructions, shown once per session right after the color-calibration
// slot (ACTIVE_COLORS is always resolved by then -- either a fresh staircase result this session,
// or a prior session's saved gains, see runSession in session_flow.js). Pages are built at trial
// runtime via a function (not a precomputed array), mirroring color_calibration.js's
// buildStimulusPreviewScreen, since getPxPerDeg() only resolves after the virtual chinrest has
// already run this session. Uses PREVIEW_SCALE/PREVIEW_SUPERSAMPLE from color_calibration.js so
// the dot-cloud/legend illustrations read at the same scaled-down size as the calibration screens

// fixed illustrative trial: a large gap between the top color and every distractor so the "MOST
// dots" question has an obvious answer, well outside any real condition's difficulty range (the
// closest real condition is [100, 60, 60, 60]). the top count matches this design's real top of
// 100 so the illustration's density is representative
const INSTRUCTION_FULL_TRIAL = { n_choice: 4, colors: COLOR_NAMES, counts: [100, 25, 25, 25], correct_color: 'orange' };

// same illustrative trial restricted to 3 colors, to demonstrate the greyed-out legend shown on
// n_choice < 4 trials. this experiment has no two-choice conditions, so the partial example is
// 3-choice (the previous experiment's was 2-choice) -- showing a 2-color example here would
// advertise a trial type the subject will never actually see
const INSTRUCTION_PARTIAL_TRIAL = { n_choice: 3, colors: ['orange', 'green', 'blue'], counts: [100, 25, 25], correct_color: 'orange' };

// draws one illustrative trial's dot cloud, scaled to PREVIEW_SCALE like color_calibration.js's
// drawStimulusPreview, but colored via the resolved ACTIVE_COLORS palette rather than a
// calibration gain, since these screens run after calibration is complete
function drawInstructionDots(ctx, cx, cy, trial) {
  const pxPerDeg = getPxPerDeg() * PREVIEW_SCALE * PREVIEW_SUPERSAMPLE;
  const dotRadiusPx = DOT_RADIUS_DEG * pxPerDeg;

  buildDotCloud(trial).forEach(dot => {
    ctx.beginPath();
    ctx.arc(cx + dot.pos[0] * pxPerDeg, cy - dot.pos[1] * pxPerDeg, dotRadiusPx, 0, 2 * Math.PI);
    ctx.fillStyle = ACTIVE_COLORS[dot.color];
    ctx.fill();
  });
}

// draws the fixed HJKL legend row, mirroring drawColorLegend's real geometry (expt_util.js)
// scaled to PREVIEW_SCALE -- validColors controls which keys show their real color vs. the same
// UNAVAILABLE_LEGEND_COLOR grey used on real trials with fewer than 4 colors
function drawInstructionLegend(ctx, cx, cy, validColors) {
  const pxPerDeg = getPxPerDeg() * PREVIEW_SCALE * PREVIEW_SUPERSAMPLE;
  const legendXDeg = [-9, -3, 3, 9].map(x => x * VISUAL_ANGLE_SCALE);
  const rectWidthPx = 4 * VISUAL_ANGLE_SCALE * pxPerDeg;
  const rectHeightPx = 3 * VISUAL_ANGLE_SCALE * pxPerDeg;

  COLOR_NAMES.forEach((color, i) => {
    const x = cx + legendXDeg[i] * pxPerDeg;
    ctx.fillStyle = validColors.includes(color) ? ACTIVE_COLORS[color] : UNAVAILABLE_LEGEND_COLOR;
    ctx.strokeStyle = 'white';
    ctx.fillRect(x - rectWidthPx / 2, cy - rectHeightPx / 2, rectWidthPx, rectHeightPx);
    ctx.strokeRect(x - rectWidthPx / 2, cy - rectHeightPx / 2, rectWidthPx, rectHeightPx);

    ctx.fillStyle = 'black';
    ctx.font = `bold ${20 * VISUAL_ANGLE_SCALE * PREVIEW_SCALE * PREVIEW_SUPERSAMPLE}px Avenir Next, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(COLOR_KEYS[color].toUpperCase(), x, cy);
  });
}

// canvas size + vertical anchor points for a dots(+legend) illustration -- wide enough for
// whichever is wider (the aperture or the full legend row), tall enough to fit the legend below
// the aperture only when this page actually shows one
function computeDecisionPreviewLayout(showLegend) {
  const pxPerDeg = getPxPerDeg() * PREVIEW_SCALE * PREVIEW_SUPERSAMPLE;
  const apertureRadiusPx = APERTURE_RADIUS_DEG * pxPerDeg;
  const legendGapPx = 3 * VISUAL_ANGLE_SCALE * pxPerDeg;
  const legendHeightPx = 3 * VISUAL_ANGLE_SCALE * pxPerDeg;
  const legendHalfSpanPx = (9 + 2) * VISUAL_ANGLE_SCALE * pxPerDeg;

  const widthPx = Math.ceil(Math.max(2 * apertureRadiusPx, 2 * legendHalfSpanPx) + 20);
  const apertureCy = 10 + apertureRadiusPx;
  const belowAperturePx = showLegend ? legendGapPx + legendHeightPx : 0;
  const heightPx = Math.ceil(apertureCy + apertureRadiusPx + belowAperturePx + 10);

  return { widthPx, heightPx, apertureCy, legendCy: apertureCy + apertureRadiusPx + legendGapPx + legendHeightPx / 2 };
}

// renders one dots(+legend) illustration to a data URL for embedding in an instructions page
function buildDecisionPreviewImage(trial, showLegend) {
  const layout = computeDecisionPreviewLayout(showLegend);
  const canvas = document.createElement('canvas');
  canvas.width = layout.widthPx;
  canvas.height = layout.heightPx;
  const ctx = canvas.getContext('2d');

  drawInstructionDots(ctx, layout.widthPx / 2, layout.apertureCy, trial);
  if (showLegend) drawInstructionLegend(ctx, layout.widthPx / 2, layout.legendCy, trial.colors);

  return { src: canvas.toDataURL(), displayWidthPx: layout.widthPx / PREVIEW_SUPERSAMPLE };
}

// confidence-screen illustration: literal readable prompt text, not shrunk by PREVIEW_SCALE like
// the dots/legend illustrations above -- there's no aperture geometry to fit on the page, and this
// text matches the real confidence trial's prompt exactly (see makeConfidenceTrial in expt_util.js)
function buildConfidencePreviewImage() {
  const widthPx = 620 * PREVIEW_SUPERSAMPLE;
  const heightPx = 50 * PREVIEW_SUPERSAMPLE;
  const canvas = document.createElement('canvas');
  canvas.width = widthPx;
  canvas.height = heightPx;

  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'white';
  ctx.font = `${24 * VISUAL_ANGLE_SCALE * PREVIEW_SUPERSAMPLE}px Avenir Next, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('How confident are you? (1 = low, 4 = high)', widthPx / 2, heightPx / 2);

  return { src: canvas.toDataURL(), displayWidthPx: widthPx / PREVIEW_SUPERSAMPLE };
}

// six pages: (1) task goal with an easy example, (2) the same example's answer revealed, (3) the
// full HJKL response mapping, (4) the greyed-out legend for <4-color trials, (5) the confidence
// scale, (6) a review reminder plus a preview of the upcoming practice block's feedback structure
// -- trial counts are read from the same config constants that build the practice blocks
// (buildDay1PracticeBlocks/buildRepeatPracticeBlocks in triallist.js) so this text can't drift out
// of sync with the actual practice trial counts
function buildMainInstructionsPages(isFirstSession) {
  const practiceFeedbackTrials = isFirstSession ? N_PRACTICE_MIXED_DAY1 : N_PRACTICE_MIXED_REPEAT;
  const practiceNoFeedbackTrials = isFirstSession ? 0 : N_PRACTICE_MIXED_REPEAT;
  const practiceTotalTrials = practiceFeedbackTrials + practiceNoFeedbackTrials;
  const correctColorLabel = capitalizeColorName(INSTRUCTION_FULL_TRIAL.correct_color);
  const correctColorKey = COLOR_KEYS[INSTRUCTION_FULL_TRIAL.correct_color].toUpperCase();
  const fullImg = buildDecisionPreviewImage(INSTRUCTION_FULL_TRIAL, false);
  const mappingImg = buildDecisionPreviewImage(INSTRUCTION_FULL_TRIAL, true);
  const partialImg = buildDecisionPreviewImage(INSTRUCTION_PARTIAL_TRIAL, true);
  const confidenceImg = buildConfidencePreviewImage();

  return [
    `<div style="font-size:1.4em;">
      <p><img src="${fullImg.src}" style="width:${fullImg.displayWidthPx}px;"></p>
      <p>In this task, you'll be seeing clouds of colored dots.</p>
      <p>Your task is to decide which color has the MOST number of dots.</p>
      <p>The dot cloud will be visible for varying, sometimes very brief amounts of time, followed by a flash of colored dots. This is expected.</p>
    </div>`,
    `<div style="font-size:1.4em;">
      <p><img src="${fullImg.src}" style="width:${fullImg.displayWidthPx}px;"></p>
      <p>In this example, the correct answer is ${correctColorLabel}.</p>
    </div>`,
    `<div style="font-size:1.4em;">
      <p><img src="${mappingImg.src}" style="width:${mappingImg.displayWidthPx}px;"></p>
      <p>To indicate your response, use H, J, K, or L to report the color with the most number of dots.</p>
      <p>Since ${correctColorLabel} has the most dots in this example, press ${correctColorKey} to indicate your response.</p>
      <p>This will be shown on every trial, so you do not have to remember them.</p>
    </div>`,
    `<div style="font-size:1.4em;">
      <p><img src="${partialImg.src}" style="width:${partialImg.displayWidthPx}px;"></p>
      <p>On trials with only 3 colors, the unavailable option is greyed out.</p>
      <p>You will not be able to respond using those keys.</p>
    </div>`,
    `<div style="font-size:1.4em;">
      <p><img src="${confidenceImg.src}" style="width:${confidenceImg.displayWidthPx}px;"></p>
      <p>After indicating your decision, you will be asked to report your confidence.</p>
      <p>1 = very low confidence</p>
      <p>2 = low confidence</p>
      <p>3 = high confidence</p>
      <p>4 = very high confidence</p>
    </div>`,
    `<div style="font-size:1.4em;">
      <p>If you're unsure about the task, please go back and review.</p>
      <p>You will now perform ${practiceTotalTrials} practice trials${practiceNoFeedbackTrials
        ? `. You will receive feedback for the first ${practiceFeedbackTrials} trials.`
        : ', with feedback.'}</p>
      <p>${practiceNoFeedbackTrials ? `No feedback will be given in the last ${practiceNoFeedbackTrials} trials and in ` : 'No feedback will be given in '}the experimental trials.</p>
    </div>`,
  ];
}

// Right Arrow (or the on-screen Next button) advances, Left Arrow (or Previous) goes back -- pages
// is a function so it's rebuilt fresh (and re-reads ACTIVE_COLORS) every time this trial actually
// runs. isFirstSession selects the day-1 vs. repeat-session practice trial counts on the last page
function mainInstructionsTrial(isFirstSession) {
  return {
    type: jsPsychInstructions,
    pages: () => buildMainInstructionsPages(isFirstSession),
    show_clickable_nav: true,
    allow_backward: true,
    key_forward: 'ArrowRight',
    key_backward: 'ArrowLeft',
    data: { phase: 'main_instructions' },
  };
}
