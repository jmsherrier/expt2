// entry point: sets up the jsPsych instance and starts the session flow
const jsPsych = initJsPsych({ display_element: 'jspsych-target' });

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
    jsPsych.finishTrial();
    return;
  }

  if (event.key === ' ' && pauseActive) {
    event.preventDefault();
    pauseRequested = false;
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
