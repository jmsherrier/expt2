// Bundles index.html + its local JS/CSS/image dependencies into one self-contained HTML file.
// Run: node build_standalone.js  (from the project root, or pass the root as argv[2])
const fs = require('fs');
const path = require('path');

const root = process.argv[2] || process.cwd();
const jsFiles = [
  'js/config.js', 'js/colors.js', 'js/conditions.js', 'js/rng.js', 'js/permutations.js',
  'js/triallist.js', 'js/stimulus.js', 'js/expt_util.js', 'js/color_calibration.js',
  'js/main_instructions.js', 'js/session_flow.js', 'js/main.js',
]; // same order as index.html's <script> tags -- later files depend on earlier ones

const read = f => fs.readFileSync(path.join(root, f), 'utf8');

const css = read('style.css');
const cardDataUri = 'data:image/png;base64,' + fs.readFileSync(path.join(root, 'img/card.png')).toString('base64');

const inlinedScripts = jsFiles
  .map(f => read(f).replace(/img\/card\.png/g, cardDataUri))
  .map(code => `<script>\n${code}\n</script>`)
  .join('\n\n');

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>MAFC Testing Experiment</title>

  <script src="https://unpkg.com/jspsych@7.3.3"></script>
  <script src="https://unpkg.com/@jspsych/plugin-html-keyboard-response@1.1.3"></script>
  <script src="https://unpkg.com/@jspsych/plugin-canvas-keyboard-response@1.1.3"></script>
  <script src="https://unpkg.com/@jspsych/plugin-fullscreen@1.2.1"></script>
  <script src="https://unpkg.com/@jspsych/plugin-virtual-chinrest@2.0.2"></script>
  <script src="https://unpkg.com/@jspsych/plugin-call-function@1.1.3"></script>
  <script src="https://unpkg.com/@jspsych/plugin-instructions@1.1.3"></script>
  <link href="https://unpkg.com/jspsych@7.3.3/css/jspsych.css" rel="stylesheet" type="text/css">
  <style>
${css}
  </style>
</head>

<body>
  <div id="pre-check-screen"></div>
  <form id="subject-entry" style="display: none;">
    <h2>Enter a trial label</h2>
    <input type="text" id="subject-id-input" maxlength="40" autocomplete="off" placeholder="e.g. trial-001">
    <p id="subject-id-error"></p>
    <button type="submit">Continue</button>
  </form>
  <div id="subject-confirm" style="display: none;">
    <p id="subject-confirm-number"><span id="subject-confirm-value"></span></p>
    <p id="subject-confirm-continue">Press Enter to continue.</p>
  </div>
  <div id="jspsych-target" style="display: none;"></div>
  <div id="pause-overlay" style="display: none;" role="dialog" aria-live="polite">
    <p>Try to minimize time paused if possible.</p>
    <p>Press spacebar to resume.</p>
  </div>
</body>

${inlinedScripts}
</html>
`;

fs.writeFileSync(path.join(root, 'index-standalone.html'), html);
console.log(`Wrote index-standalone.html (${(html.length / 1024).toFixed(0)} KB)`);
