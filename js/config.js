// fixed per-subject seeds, arbitrary but documented -- this app only needs to be internally
// deterministic/reproducible. DELIBERATELY DIFFERENT from the previous experiment's seeds so a
// subject who took part in both doesn't get a correlated trial order across the two studies.
const SUBJECT_SEEDS = {
  1: 512907, 2: 664218, 3: 209455, 4: 837640, 5: 391082,
  6: 745913, 7: 128374, 8: 580261, 9: 963148, 10: 447025,
};

// highest participant number this study accepts -- mirrored in save.php/save_color.php/
// progress.php (MAX_SUBJECT_ID) and in index.html's number input. raise all four together.
const MAX_SUBJECT_ID = 10;

// filename stem for saved data: <prefix>_P01_S01.csv / <prefix>_P01_COLOR.csv. distinct from the
// previous experiment's MAFC_EXPT so the two studies' data files can never collide even if a
// data directory is ever shared. mirrored in the three php endpoints.
const DATA_PREFIX = 'MAFC2_EXPT';

// trial-count design: 90 reps x 8 conditions = 720 trials, run as a SINGLE session.
//   ASSUMPTION -- the design brief fixed the conditions but not the trial budget. 720 is carried
//   over from the previous experiment's per-session size (~1 hour) and divides evenly by 8
//   conditions (90 reps each) and by the 12 blocks below. To change the budget, keep
//   N_REPS * (number of conditions) === N_SESSIONS * SESSION_SIZE, and keep SESSION_SIZE
//   divisible by N_TRIAL_TO_BREAK * BLOCKS_PER_RUN * RUNS_PER_SESSION.
const N_REPS = 90;
const N_SESSIONS = 1;
const SESSION_SIZE = 720;

// practice block sizes. day 1 (first-ever session): 20 easy-tier trials w/ feedback, 20
// medium-tier w/ feedback, 20 easy+medium mixed w/o feedback = 60 total. every later session: 20
// easy+medium mixed w/ feedback, 20 more w/o feedback = 40 total. see DIFFICULTY_TIERS in
// conditions.js and buildDay1PracticeBlocks/buildRepeatPracticeBlocks in triallist.js.
// N_SESSIONS is 1 here, so only the day-1 blocks actually run -- the repeat path is kept intact
// in case the design later grows to multiple sessions.
const N_PRACTICE_EASY_DAY1 = 20;
const N_PRACTICE_MEDIUM_DAY1 = 20;
const N_PRACTICE_MIXED_DAY1 = 20;
const N_PRACTICE_MIXED_REPEAT = 20;

// each session is 3 runs x 4 blocks x 60 trials/block = 720, so a break falls at every block
// boundary
const N_TRIAL_TO_BREAK = 60;
const RUNS_PER_SESSION = 3;
const BLOCKS_PER_RUN = 4;
const BREAK_DURATION = 30;

// single tunable knob for every visual-angle size in the experiment (aperture, dots, fixation,
// legend, prompt offset) -- multiplies the base degree values below and in expt_util.js
const VISUAL_ANGLE_SCALE = 1.0;

// dot display parameters, degrees of visual angle -- placeholders pending real display
// calibration, carried over unchanged from the previous experiment. NOTE: this design's densest
// condition is 100+80+70+30 = 280 dots, well under the previous experiment's 160+... maximum, so
// the existing aperture/dot radii have more than enough room for non-overlapping placement.
const APERTURE_RADIUS_DEG = 8.0 * VISUAL_ANGLE_SCALE;
const DOT_RADIUS_DEG = 0.15 * VISUAL_ANGLE_SCALE;

// response keys for the decision phase, one key per color -- unchanged, so a subject who has run
// the previous experiment keeps the same motor mapping
const COLOR_KEYS = { red: 'h', green: 'j', blue: 'k', yellow: 'l' };

// response keys for the confidence phase, 1 (low) to 4 (high)
const CONFIDENCE_KEYS = ['1', '2', '3', '4'];

// stimulus durations are placeholders pending a pilot accuracy curve. This manipulation only has
// the intended effective viewing-time contrast when the backward mask remains enabled.
const STIMULUS_DURATIONS = [150, 400];
const MASK_DURATION = 50;
const MASK_N_DOTS = 280;

// `top` is counts[0] and ratio_1..3 are counts[i]/top, derived in conditions.js from the literal
// counts -- ratio_3 is always blank on 3-choice trials, as before.
const CSV_HEADER = 'date,time,sid,seed,gain_red,gain_green,gain_blue,gain_yellow,session,trial,duration,n_choice,condition_id,top,ratio_1,ratio_2,ratio_3,colors,counts,stim,resp,acc,rt,conf,c_rt';

// color-matching calibration: 4 sliders (one per color), each dims that color's full-saturation
// hex down toward black -- gain 1.0 is unadjusted, CALIBRATION_FLOOR is the dimmest allowed. no
// slider goes above 1.0 since every base COLORS hex is already fully saturated (applyGain in
// colors.js is a no-op for gain > 1). subject repeats the match N_COLOR_CALIBRATION_REPS times,
// each starting from an independent random slider position, and the final per-color gain is the
// average across all reps
const CALIBRATION_FLOOR = 0.20;
const CALIBRATION_DOTS_PER_COLOR = 80;
const N_COLOR_CALIBRATION_REPS = 7;

const COLOR_CSV_HEADER = 'date,time,sid,seed,trial,gain_red,gain_green,gain_blue,gain_yellow';

// shown before the virtual chinrest. this study is a single session, so the "returning" variant
// is currently unreachable -- it's kept (and still selected by the same isFirstSession flag) so
// raising N_SESSIONS is a one-constant change
const CHINREST_INTRO_TEXT_FIRST = `
  <p>Welcome to the experiment!</p>
  <p>We will first measure your viewing distance and monitor size.</p>
  <p>Once measured, please keep your seating position and screen where they are for the rest of the session.</p>
  <p>Press spacebar whenever you're ready.</p>
`;

const CHINREST_INTRO_TEXT_RETURNING = `
  <p>Welcome back to the experiment!</p>
  <p>We will first measure your viewing distance and monitor size.</p>
  <p>Make sure you are using the same monitor as you've used in previous sessions.</p>
  <p>Press spacebar whenever you're ready.</p>
`;

// shown as the very first screen of the experiment, before the participant number is even
// entered. the previous experiment's monitor-consistency line is dropped here (nothing to be
// consistent with in a single-session study) and replaced with a seating/lighting reminder, since
// the chinrest calibration holds only for as long as the subject stays put.
const PRE_CHECK_TEXT = `
  <div style="font-size:1.2em; font-weight:bold;">
    <p>Before you continue, please make sure:</p>
    <p>1. Your browser zoom level is 100%.</p>
    <p>2. You are using a Chrome or Firefox browser.</p>
    <p>3. You have a stable internet connection.</p>
    <p>4. You have at least an hour of undisturbed time.</p>
    <p>5. You are seated comfortably in a room with steady lighting.</p>
    <p>Press spacebar to continue.</p>
  </div>
`;

// text markup for the two-screen pre-calibration instructions -- illustration on top before any
// written instructions, with a larger font than the experiment's other instruction text (see
// style.css's --text-scale) since this pairs with an illustration and needs to read clearly at a
// glance. img src/displayWidthPx are computed at runtime in color_calibration.js (that file loads
// after this one, so it has access to the canvas/color-gain helpers this template doesn't need
// directly)
function buildColorCalibrationStimulusText(stimulusImgSrc, displayWidthPx) {
  return `
    <div style="font-size:1.4em;">
      <p><img src="${stimulusImgSrc}" style="width:${displayWidthPx}px;"></p>
      <p>Before the task begins, we'd like to first configure the saliency of colors used in the experiment.</p>
      <p>You will see a cloud of colored dots, similar to the example shown above.</p>
      <p>Use the Right Arrow key, or click Next, to continue.</p>
    </div>
  `;
}

// second calibration instructions page: plain text, no illustration -- the real sliders/button
// are shown on the very next screen, so there's nothing extra to mock up here
function buildColorCalibrationMappingText() {
  return `
    <div style="font-size:1.4em;">
      <p>You will see four sliders labeled Red, Green, Blue, and Yellow, each starting at a random position.</p>
      <p>Drag the sliders until no single color looks more salient than the others in the dot cloud.</p>
      <p>Once you're satisfied, click Confirm.</p>
      <p>You will repeat this ${N_COLOR_CALIBRATION_REPS} times.</p>
      <p>Use the Right Arrow key, or click Next, to begin.</p>
    </div>
  `;
}

// trial counts are interpolated from the same constants that drive the actual session structure
// (RUNS_PER_SESSION/BLOCKS_PER_RUN/N_TRIAL_TO_BREAK above) so this text can't drift out of sync,
// same reasoning as buildMainInstructionsPages in main_instructions.js
function buildTransitionText() {
  return `
    <div style="font-size:1.4em;">
      <p>Good job! You have completed the practice trials.</p>
      <p>You will now perform ${RUNS_PER_SESSION} runs of ${BLOCKS_PER_RUN} blocks, with each block containing ${N_TRIAL_TO_BREAK} trials.</p>
      <p>No feedback will be given during the experimental trials.</p>
      <p>Make sure to try your best!</p>
      <p>Press any key to continue.</p>
    </div>
  `;
}

// single-session study, so finishing a session finishes the study -- the previous experiment's
// "return next week" line is gone. STUDY_COMPLETE_TEXT below still exists for the case where a
// subject reopens the page after already finishing.
const SESSION_COMPLETE_TEXT = `
  <div style="font-size:1.4em;">
    <p>You have completed the experiment!</p>
    <p>Make sure to save all the files before closing this window.</p>
  </div>
`;
const SAVE_FAILED_TEXT = `
  <div style="font-size:1.4em;">
    <p>There was an error saving your data.</p>
    <p>Please try again later.</p>
  </div>
`;

// shown above the "Save Data to Computer" button on the local-backup screen at the end of every
// session -- placeholder wording
const LOCAL_SAVE_PROMPT_TEXT = 'As a backup, please also save a copy of your data to your own computer.';

const STUDY_COMPLETE_TEXT = '<p>Hurray! You have completed this study. Thank you for participating!</p>';
