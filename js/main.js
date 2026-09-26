// entry point: sets up the jsPsych instance and wires the subject-id form to the session flow
const jsPsych = initJsPsych({ display_element: 'jspsych-target' });

// scales all HTML-rendered trial text (instructions, transitions, completion screens) by the
// same VISUAL_ANGLE_SCALE factor used for every canvas-drawn size -- read by the CSS rule in
// style.css via the --text-scale custom property
document.documentElement.style.setProperty('--text-scale', VISUAL_ANGLE_SCALE);

const subjectIdInput = document.getElementById('subject-id-input');

const preCheckEl = document.getElementById('pre-check-screen');
const subjectEntryEl = document.getElementById('subject-entry');
const subjectConfirmEl = document.getElementById('subject-confirm');
const subjectConfirmValueEl = document.getElementById('subject-confirm-value');
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

// typing into a text field (the trial-label input) shouldn't be intercepted as the pause
// shortcut -- without this, typing a subject label containing "p" pauses the experiment before
// it's even started
function isTypingIntoField(event) {
  const tag = event.target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || event.target.isContentEditable;
}

document.addEventListener('keydown', function handlePauseKey(event) {
  if (isTypingIntoField(event)) return;
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

// very first screen of the whole page load, shown before the trial label is even entered
// -- spacebar reveals the subject-id form
preCheckEl.innerHTML = PRE_CHECK_TEXT;
document.addEventListener('keydown', function dismissPreCheck(event) {
  if (event.key !== ' ') return;
  document.removeEventListener('keydown', dismissPreCheck);
  preCheckEl.style.display = 'none';
  subjectEntryEl.style.display = 'flex';
  subjectIdInput.focus();
});

// Enter and the on-screen button both submit through the form's native submit event.
subjectEntryEl.addEventListener('submit', (event) => {
  event.preventDefault();
  const errorEl = document.getElementById('subject-id-error');
  const subjectId = subjectIdInput.value.trim();

  if (!TRIAL_LABEL_PATTERN.test(subjectId)) {
    errorEl.textContent = 'Use 1-40 letters, numbers, underscores, or hyphens.';
    return;
  }

  errorEl.textContent = '';
  subjectEntryEl.style.display = 'none';
  subjectConfirmValueEl.textContent = subjectId;
  subjectConfirmEl.style.display = 'flex';

  // second enter press (on the confirmation screen) actually starts the experiment, giving the
  // participant a chance to refresh instead if the number shown is wrong
  document.addEventListener('keydown', async function confirmSubjectId(confirmEvent) {
    if (confirmEvent.key !== 'Enter') return;
    document.removeEventListener('keydown', confirmSubjectId);
    subjectConfirmEl.style.display = 'none';
    await startExperiment(subjectId);
  });
});
