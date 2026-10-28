// fixed per-subject seeds, arbitrary but documented -- this app only needs to be internally
// deterministic/reproducible. DELIBERATELY DIFFERENT from the previous experiment's seeds so a
// subject who took part in both doesn't get a correlated trial order across the two studies.
// there's no user-entered trial label anymore (main.js generates a timestamp-based run id
// instead) -- this just hashes whatever string it's given into a seed
function seedForTrialLabel(label) {
  label = String(label);
  let hash = 2166136261;
  for (let i = 0; i < label.length; i += 1) {
    hash ^= label.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

// trial-count design: 90 reps x 8 conditions = 720 trials, run as a SINGLE session. Each
// condition's 90 reps split evenly across STIMULUS_DURATIONS (45 at each duration), via the same
// assignBalancedDurations machinery as before -- see triallist.js. To change the budget, keep
//   N_REPS * (number of conditions) === N_SESSIONS * SESSION_SIZE, and keep SESSION_SIZE
//   divisible by N_TRIAL_TO_BREAK * BLOCKS_PER_RUN * RUNS_PER_SESSION.
const N_REPS = 90;
const N_SESSIONS = 1;
const SESSION_SIZE = 720;

// practice block sizes. day 1 (first-ever session): a single 20-trial easy+medium mixed block
// w/ feedback. every later session: 20 easy+medium mixed w/ feedback, 20 more w/o feedback = 40
// total. see DIFFICULTY_TIERS in conditions.js and buildDay1PracticeBlocks/
// buildRepeatPracticeBlocks in triallist.js. N_SESSIONS is 1 here, so only the day-1 block
// actually runs -- the repeat path is kept intact in case the design later grows to multiple
// sessions.
const N_PRACTICE_MIXED_DAY1 = 20;
const N_PRACTICE_MIXED_REPEAT = 20;

// short blocks so breaks come often enough that nobody needs to pause mid-trial (there is no pause
// key; a trial interrupted for some other reason shows up as a very long RT and is excluded at
// analysis). 1 run x 18 blocks x 40 trials = 720, i.e. a break every 40 trials
const N_TRIAL_TO_BREAK = 40;
const RUNS_PER_SESSION = 1;
const BLOCKS_PER_RUN = 18;
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
const COLOR_KEYS = { orange: 'h', green: 'j', blue: 'k', magenta: 'l' };

// response keys for the confidence phase, 1 (low) to 4 (high)
const CONFIDENCE_KEYS = ['1', '2', '3', '4'];

// stimulus durations: short/long, chosen from the duration pilot (see README) -- each of the 8
// conditions runs at both.
const STIMULUS_DURATIONS = [100, 500];

// `top` is counts[0] and ratio_1..3 are counts[i]/top, derived in conditions.js from the literal
// counts -- ratio_3 is always blank on 3-choice trials, as before.
const CSV_HEADER = 'date,time,sid,seed,gain_orange,gain_green,gain_blue,gain_magenta,session,trial,duration,n_choice,condition_id,top,ratio_1,ratio_2,ratio_3,colors,counts,stim,resp,acc,rt,conf,c_rt,share_data';

// IRB consent screen (js/consent.js) before the username screen
const SHOW_CONSENT = true;

// server data files (save.php/save_color.php/progress.php, folder woto_data/) are named
// <DATA_PREFIX>_<gatech username>.csv -- the flow-test build uses 'woto_test' so its runs can never
// collide with (or be resumed as) a real participant's file. The PHP endpoints whitelist both.
const DATA_PREFIX = 'woto';

// color-matching calibration: each gain dims that color's base hex toward black (1.0 = unadjusted).
// Green is the fixed reference at GREEN_FIXED_GAIN and is never adjustable; the other three colors'
// sliders run GREEN_FIXED_GAIN +/- CALIBRATION_RANGE, so the slider midpoint is green's own level.
//   Step 1: one pairwise screen per other color (green + that color only, its slider starting at a
//           random position) -- adjusts each color relative to green
//   Step 2: all four colors together, sliders starting at the step-1 values (green locked); then
//           CALIBRATION_CHECK_STIMULI brief equal-count clouds (CALIBRATION_CHECK_MS each); then one
//           refinement screen starting where they left off. The refinement's values are final.
// 0.55: mid-range, so the other colors have room above and below, and the whole display can't end
// up dim (P1 in the first pilots set every color ~0.4 and had the lowest accuracy). Slightly below
// the green the first pilots matched to (0.60, 0.70), since green was over-picked as a wrong
// option by all three -- but because the others are matched TO green, this mostly sets overall
// brightness; it can't by itself remove a green (or J-key) bias.
const GREEN_FIXED_GAIN = 0.55;
const CALIBRATION_RANGE = 0.30;
const CALIBRATION_MIN = Math.round((GREEN_FIXED_GAIN - CALIBRATION_RANGE) * 100) / 100;
const CALIBRATION_MAX = Math.round((GREEN_FIXED_GAIN + CALIBRATION_RANGE) * 100) / 100;
const CALIBRATION_DOTS_PER_COLOR = 80;
// the colors adjusted against green in step 1, in screen order
const CALIBRATION_PAIR_COLORS = ['orange', 'blue', 'magenta'];
// saved calibration rows: one per pairwise screen, then the all-colors screen, then the refinement
const N_CALIBRATION_SCREENS = CALIBRATION_PAIR_COLORS.length + 2;
const CALIBRATION_CHECK_STIMULI = 3;
const CALIBRATION_CHECK_MS = 1500;

const CALIBRATION_CHECK_TEXT = `
  <div style="font-size:1.4em;">
    <p>Next you will see ${CALIBRATION_CHECK_STIMULI} brief dot clouds. Each one has the same number of dots in every color.</p>
    <p>Watch whether any color stands out, or is hard to notice.</p>
    <p>Press spacebar to begin.</p>
  </div>
`;

const CALIBRATION_REFINE_TEXT = `
  <div style="font-size:1.4em;">
    <p>Did any color stand out, or seem hard to notice?</p>
    <p>On the next screen the sliders start where you set them. Adjust any color that stood out or was hard to notice. Green stays fixed.</p>
    <p>If all the colors looked equally noticeable, just click Confirm.</p>
    <p>Press spacebar to continue.</p>
  </div>
`;

const COLOR_CSV_HEADER = 'date,time,sid,seed,trial,gain_orange,gain_green,gain_blue,gain_magenta';

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

// shown as the very first screen of the experiment, before the trial label is even
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
      <p>Green is the reference color and stays fixed.</p>
      <p>First you will see Green together with one other color. Drag that color's slider until neither color looks more noticeable than the other, then click Confirm. You will do this for ${CALIBRATION_PAIR_COLORS.map(capitalizeColorName).join(', ').replace(/, ([^,]*)$/, ', and $1')}.</p>
      <p>Then you will see all four colors together and can fine-tune them.</p>
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
      <p>You will now complete ${RUNS_PER_SESSION * BLOCKS_PER_RUN} blocks of ${N_TRIAL_TO_BREAK} trials, with a short break after each block.</p>
      <p>No feedback will be given during the experimental trials.</p>
      <p>Remember to use the whole confidence scale, from 1 to 4.</p>
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
    <p>Your data has been saved. Thank you for participating. You can now close this window.</p>
  </div>
`;

// only reached when the server save failed or no server was found (e.g. the file opened locally):
// the data would otherwise be lost, so the participant downloads it and sends it in
const LOCAL_SAVE_PROMPT_TEXT = `
  <div style="font-size:1.4em;">
    <p>You have completed the experiment, but your data could not be saved to the server.</p>
    <p>Please click the button below to download your data file, and email it to the researcher.</p>
  </div>
`;

// username screen (main.js), shown after consent -- the username names the data file
const USERNAME_PROMPT_TEXT = `
  <p>Please enter your Georgia Tech username (for example, gburdell3).</p>
  <p>Enter only the username, without @gatech.edu.</p>
`;

const STUDY_COMPLETE_TEXT = '<p>Hurray! You have completed this study. Thank you for participating!</p>';
