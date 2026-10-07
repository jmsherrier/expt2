// entry point: sets up the jsPsych instance and starts the session flow
//
// on_trial_finish blurs a still-focused button left over from the trial that just ended --
// without this, a button (e.g. the chinrest card-resize screen's "Click here when the image is
// the correct size") can keep keyboard focus into the NEXT trial, and a Space/Enter meant for
// that next trial's own listener instead re-activates the stale button first (native browser
// behavior: Space/Enter on a focused button clicks it). That's what made the chinrest's
// blind-spot "press space to begin" screen need an extra mouse click before spacebar worked, and
// is the likely cause of the occasional rapid double-advance ("flash") through a screen right
// after a button-click transition.
const jsPsych = initJsPsych({
  display_element: 'jspsych-target',
  on_trial_finish: function () {
    if (document.activeElement && document.activeElement.tagName === 'BUTTON') {
      document.activeElement.blur();
    }
  },
});

// scales all HTML-rendered trial text (instructions, transitions, completion screens) by the
// same VISUAL_ANGLE_SCALE factor used for every canvas-drawn size -- read by the CSS rule in
// style.css via the --text-scale custom property
document.documentElement.style.setProperty('--text-scale', VISUAL_ANGLE_SCALE);

const preCheckEl = document.getElementById('pre-check-screen');
const pauseOverlayEl = document.getElementById('pause-overlay');
const pauseHintEl = document.createElement('div');
pauseHintEl.id = 'pause-hint';
pauseHintEl.textContent = 'Press P to pause';
document.body.appendChild(pauseHintEl);

let pauseRequested = false;
let pauseActive = false;

function setPauseHintVisible(visible) {
  pauseHintEl.style.display = visible ? 'block' : 'none';
}

document.addEventListener('keydown', function handlePauseKey(event) {
  if (event.key.toLowerCase() === 'p' && !pauseActive && pauseHintEl.style.display !== 'none') {
    event.preventDefault();
    pauseRequested = true;
    pauseActive = true;
    pauseOverlayEl.style.display = 'flex';
    // an externally-forced finishTrial() skips the plugin's own cleanup, so its key listener and
    // duration timer survive into the replay: one later keypress then ended two screens at once
    // (saving the decision key as the confidence rating -> NaN), and a stale stimulus timer could
    // end the pause gate early
    jsPsych.pluginAPI.cancelAllKeyboardResponses();
    jsPsych.pluginAPI.clearAllTimeouts();
    jsPsych.finishTrial();
    return;
  }

  // resuming only lifts the overlay -- pauseRequested is consumed by makePauseableTrial's
  // loop_function so the interrupted trial still replays from the start
  if (event.key === ' ' && pauseActive) {
    event.preventDefault();
    pauseActive = false;
    pauseOverlayEl.style.display = 'none';
  }
});

// very first screen of the whole page load -- spacebar starts the session directly, no label to
// type or confirm. subjectId is now just an internal run identifier (seeds the trial RNG, tags
// the CSV's sid column) rather than something a person enters
preCheckEl.innerHTML = PRE_CHECK_TEXT;
document.addEventListener('keydown', function dismissPreCheck(event) {
  if (event.key !== ' ') return;
  document.removeEventListener('keydown', dismissPreCheck);
  preCheckEl.style.display = 'none';
  startExperiment(String(Date.now()));
});
