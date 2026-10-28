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

// Georgia Tech username, after consent: it names the data file (<DATA_PREFIX>_<username>.csv),
// fills the CSV's sid column and seeds the trial order, and re-entering it after a crash resumes
// the saved session. Accepts a pasted address by dropping anything from '@' on
function showUsernameScreen(onDone) {
  preCheckEl.innerHTML = `
    <form id="username-form" style="font-size:1.2em; text-align:center;">
      ${USERNAME_PROMPT_TEXT}
      <p><input id="username-input" type="text" autocomplete="off" spellcheck="false" style="font-size:1.1em; padding:6px 10px; width:240px;"></p>
      <p id="username-error" style="color:#ffb4a8; min-height:1.4em;"></p>
      <p><button type="submit" style="font-size:1.1em; padding:8px 24px;">Continue</button></p>
    </form>`;
  const input = document.getElementById('username-input');
  input.focus();
  document.getElementById('username-form').addEventListener('submit', function (event) {
    event.preventDefault();
    const username = input.value.trim().toLowerCase().replace(/@.*$/, '');
    if (!/^[a-z][a-z0-9]{1,29}$/.test(username)) {
      document.getElementById('username-error').textContent = 'Please enter a username like gburdell3: letters and numbers only, no spaces.';
      return;
    }
    onDone(username);
  });
}

// last screen before the experiment starts -- spacebar starts the session
function showPreCheck(username) {
  preCheckEl.innerHTML = PRE_CHECK_TEXT;
  document.addEventListener('keydown', function dismissPreCheck(event) {
    if (event.key !== ' ') return;
    document.removeEventListener('keydown', dismissPreCheck);
    preCheckEl.style.display = 'none';
    startExperiment(username);
  });
}

const askUsername = () => showUsernameScreen(showPreCheck);
if (SHOW_CONSENT) showConsent(askUsername); else askUsername();
