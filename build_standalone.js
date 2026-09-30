// Bundles index.html + its local JS/CSS/image dependencies into one self-contained HTML file.
// Run: node build_standalone.js  (from the project root, or pass the root as argv[2])
// Optional argv[3]: JSON object of js/config.js constants to override (e.g. a longer trial
// budget for a specific recipient) -- '{"N_REPS":50,"SESSION_SIZE":400,"N_TRIAL_TO_BREAK":80,
// "BLOCKS_PER_RUN":5,"RUNS_PER_SESSION":1}'. Optional argv[4]: output filename (defaults to
// index-standalone.html). config.js itself is never edited -- the override is applied only to
// the copy inlined into this one build.
const fs = require('fs');
const path = require('path');

const root = process.argv[2] || process.cwd();
const overrides = process.argv[3] ? JSON.parse(process.argv[3]) : {};
const outFile = process.argv[4] || 'index-standalone.html';
const jsFiles = [
  'js/config.js', 'js/colors.js', 'js/conditions.js', 'js/rng.js', 'js/permutations.js',
  'js/triallist.js', 'js/stimulus.js', 'js/expt_util.js', 'js/color_calibration.js',
  'js/main_instructions.js', 'js/session_flow.js', 'js/main.js',
]; // same order as index.html's <script> tags -- later files depend on earlier ones

const read = f => fs.readFileSync(path.join(root, f), 'utf8');

function applyOverrides(code, values) {
  let out = code;
  for (const [name, value] of Object.entries(values)) {
    const pattern = new RegExp(`(const ${name}\\s*=\\s*)[^;]+;`);
    if (!pattern.test(out)) throw new Error(`override target not found in config.js: ${name}`);
    out = out.replace(pattern, `$1${JSON.stringify(value)};`);
  }
  return out;
}

const css = read('style.css');
const cardDataUri = 'data:image/png;base64,' + fs.readFileSync(path.join(root, 'img/card.png')).toString('base64');

const inlinedScripts = jsFiles
  .map(f => {
    let code = read(f);
    if (f === 'js/config.js') code = applyOverrides(code, overrides);
    return code.replace(/img\/card\.png/g, cardDataUri);
  })
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
  <div id="jspsych-target" style="display: none;"></div>
  <div id="pause-overlay" style="display: none;" role="dialog" aria-live="polite">
    <p>Try to minimize time paused if possible.</p>
    <p>Press spacebar to resume.</p>
  </div>
</body>

${inlinedScripts}
</html>
`;

fs.writeFileSync(path.join(root, outFile), html);
console.log(`Wrote ${outFile} (${(html.length / 1024).toFixed(0)} KB)`);
