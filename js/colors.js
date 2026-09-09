// standard RGB hex codes, will be replaced with matched values from the color-matching procedure
// later -- same placeholder values as util/colors.py
const COLORS = {
  red: '#FF0000',
  green: '#00FF00',
  blue: '#0000FF',
  yellow: '#FFFF00',
};

// numeric codes for raw data output, RGBY = 1,2,3,4, keeps color columns text-free
const COLOR_CODES = {
  red: 1,
  green: 2,
  blue: 3,
  yellow: 4,
};

// insertion order (red, green, blue, yellow) matters -- it feeds the permutation generator below
const COLOR_NAMES = Object.keys(COLORS);

// 'red' -> 'Red', for subject-facing text -- COLOR_NAMES/correct_color are always lowercase
// internally, so every screen that names a color in prose (instructions, feedback) goes through this
function capitalizeColorName(color) {
  return color.charAt(0).toUpperCase() + color.slice(1);
}

// scales a #RRGGBB hex color's channels by `gain`, clamped to the valid 0-255 range per channel --
// clamping (not just rounding) is what keeps an already-saturated channel (255) from overflowing
// when gain > 1, and keeps a heavily-dimmed channel from going negative
function applyGain(hex, gain) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const clamp = v => Math.max(0, Math.min(255, Math.round(v * gain)));
  const toHex = v => v.toString(16).padStart(2, '0');
  return `#${toHex(clamp(r))}${toHex(clamp(g))}${toHex(clamp(b))}`;
}

// per-color multiplier applied on top of the base COLORS palette -- 1.0 means unadjusted. every
// base COLORS hex is already fully saturated (one channel at 255, the rest at 0), so a gain above
// 1.0 is a no-op: clamp can't push a maxed channel any higher, and a 0 channel stays 0 regardless
// of the multiplier. starting the staircase AT 1.0 would leave step-ups with nothing to do, so
// instead it starts at 75% of full intensity, leaving genuine headroom to move a color brighter or
// dimmer
const DEFAULT_START_GAIN = 0.75;
const DEFAULT_COLOR_GAINS = { red: DEFAULT_START_GAIN, green: DEFAULT_START_GAIN, blue: DEFAULT_START_GAIN, yellow: DEFAULT_START_GAIN };

function getGainedColors(gains) {
  const gained = {};
  COLOR_NAMES.forEach(c => { gained[c] = applyGain(COLORS[c], gains[c]); });
  return gained;
}

// colors actually used for drawing during practice/main trials, set once color calibration
// resolves (a fresh staircase result or a prior session's saved gains) -- COLORS itself stays the
// fixed, un-gained base palette so gains are always computed relative to the same reference
let ACTIVE_COLORS = { ...COLORS };

function setActiveColors(gains) {
  ACTIVE_COLORS = getGainedColors(gains);
}
