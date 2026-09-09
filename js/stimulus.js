// rejection-sample dot centers uniformly within the aperture (by area, not bunched at center) so
// no two dots overlap, regardless of the color eventually assigned to them -- same algorithm as
// the pilot's generate_dot_positions. uses plain Math.random, not the subject's seeded rng, since
// dot layout is visual only and never needs to be reproduced for cross-day resume
function generateDotPositions(nDots, apertureRadius, dotRadius, maxAttempts = 500) {
  const positions = [];
  const placeRadius = apertureRadius - dotRadius;
  let attempts = 0;

  while (positions.length < nDots) {
    attempts += 1;
    if (attempts > maxAttempts * nDots) {
      throw new Error(`could not place ${nDots} non-overlapping dots in ${attempts} attempts, lower dot_radius or raise aperture_radius`);
    }

    // r = placeRadius * sqrt(uniform) samples uniformly by area, not bunched at center
    const r = placeRadius * Math.sqrt(Math.random());
    const theta = Math.random() * 2 * Math.PI;
    const candidate = [r * Math.cos(theta), r * Math.sin(theta)];

    if (positions.length === 0) {
      positions.push(candidate);
      continue;
    }

    const minDist = positions.reduce((min, p) =>
      Math.min(min, Math.hypot(p[0] - candidate[0], p[1] - candidate[1])), Infinity);
    if (minDist >= 2 * dotRadius) positions.push(candidate);
  }

  return positions;
}

// positions are generated color-agnostic, then counts-many copies of each color are shuffled
// independently and zipped to positions -- zero positional correlation with color, same approach
// as the pilot's build_dot_stim
function buildDotCloud(trial) {
  const nTotal = trial.counts.reduce((a, b) => a + b, 0);
  const positions = generateDotPositions(nTotal, APERTURE_RADIUS_DEG, DOT_RADIUS_DEG);

  const colorLabels = [];
  trial.colors.forEach((color, i) => {
    for (let j = 0; j < trial.counts[i]; j++) colorLabels.push(color);
  });
  shuffle(colorLabels, Math.random);

  return positions.map((pos, i) => ({ pos, color: colorLabels[i] }));
}
