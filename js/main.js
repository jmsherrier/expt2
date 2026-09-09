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

// very first screen of the whole page load, shown before the participant number is even entered
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
  const enteredId = subjectIdInput.value.trim();
  const subjectId = Number(enteredId);

  if (!/^\d+$/.test(enteredId) || !Number.isInteger(subjectId) || subjectId < 1 || subjectId > MAX_SUBJECT_ID) {
    errorEl.textContent = 'Please enter a whole number between 1 and 10.';
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
