// Equiluminant 4 palette (see palette-review-final.html) -- equal CAM16 lightness and
// colorfulness, hues spaced evenly, replacing the old full-saturation RGBY primaries
const COLORS = {
  orange: '#D78426',
  green: '#56B16E',
  blue: '#40A4E4',
  magenta: '#CA79C4',
};

// numeric codes for raw data output, keeps color columns text-free
const COLOR_CODES = {
  orange: 1,
  green: 2,
  blue: 3,
  magenta: 4,
};

// insertion order (orange, green, blue, magenta) matters -- it feeds the permutation generator below
const COLOR_NAMES = Object.keys(COLORS);

// 'orange' -> 'Orange', for subject-facing text -- COLOR_NAMES/correct_color are always lowercase
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
// color starts at green's fixed level (GREEN_FIXED_GAIN, config.js), the midpoint of the others'
// slider range (CALIBRATION_MIN..CALIBRATION_MAX)
const DEFAULT_COLOR_GAINS = { orange: GREEN_FIXED_GAIN, green: GREEN_FIXED_GAIN, blue: GREEN_FIXED_GAIN, magenta: GREEN_FIXED_GAIN };

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
