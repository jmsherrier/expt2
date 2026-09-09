// raw csv text for the new experiment's condition set. UNLIKE the previous experiment's
// conditions.csv (which stored a `top` count plus ratios of it), this design is specified
// directly in dot counts, so counts are the source of truth here and `top`/`ratios` are derived
// below. that keeps the saved data file's columns (top, ratio_1..ratio_3) byte-compatible with
// the previous experiment's output while letting a future condition be any arbitrary set of
// counts, not just clean multiples of a shared top.
//
// design: 3 three-choice conditions + 5 four-choice conditions = 8 total. no two-choice
// conditions in this experiment.
const CONDITIONS_CSV = `n_choice,count_1,count_2,count_3,count_4
3,100,70,70,
3,100,80,60,
3,100,90,50,
4,100,80,50,50
4,100,80,65,35
4,100,70,55,55
4,100,70,70,40
4,100,60,60,60`;

// choice-set sizes present in this experiment -- previously hard-coded as [2, 3, 4] in several
// places, pulled out here so triallist.js and buildDifficultyTiers stay in sync with the csv
const N_CHOICE_SIZES = [3, 4];

// parse the embedded csv into CONDITIONS = {3:[...], 4:[...]}, preserving each row's position
// within its n_choice group -- that position is the condition_id used everywhere else, so row
// order here must stay identical to the design table above.
//
// each parsed condition carries:
//   counts  - the literal dot counts, rank-ordered (most dots first)
//   top     - counts[0], the winning color's count (kept for the data file's `top` column)
//   ratios  - counts[i]/top for i > 0 (kept for the data file's ratio_1..3 columns, and used by
//             buildDifficultyTiers below to rank difficulty)
function parseConditions(csvText) {
  const lines = csvText.trim().split('\n').slice(1);
  const conditions = {};
  N_CHOICE_SIZES.forEach(n => { conditions[n] = []; });

  lines.forEach(line => {
    const cells = line.split(',');
    const nChoice = parseInt(cells[0], 10);
    const counts = cells.slice(1, 1 + nChoice).map(Number);
    const top = counts[0];
    const ratios = counts.slice(1).map(c => c / top);
    conditions[nChoice].push({ counts, top, ratios });
  });

  return conditions;
}

const CONDITIONS = parseConditions(CONDITIONS_CSV);

// pools every condition across all n_choice sizes into 3 difficulty tiers, ranked by ratio1
// (ratios[0]) -- smaller ratio1 means a bigger gap between the top and 2nd-place color, i.e.
// easier. unchanged from the previous experiment except that it now splits 8 conditions (3/3/2)
// instead of 75 (25/25/25); the divmod sizing already handled any pool size. used by the
// practice-trial builders in triallist.js: day 1 draws separately from easy and medium, every
// later session draws from the two pooled together. hard is computed but not used by practice.
//
// with only 8 conditions the tiers are coarse -- easy is [100,70,55,55], [100,60,60,60],
// [100,80,65,35] and hard is [100,80,60], [100,80,50,50], [100,90,50]. worth revisiting if
// practice feels mis-pitched, since ratio1 alone ignores how many distractors sit just behind the
// leader.
function buildDifficultyTiers() {
  const flat = [];
  N_CHOICE_SIZES.forEach(nChoice => {
    CONDITIONS[nChoice].forEach((cond, conditionId) => {
      flat.push({
        n_choice: nChoice, condition_id: conditionId,
        top: cond.top, ratios: cond.ratios, counts: cond.counts,
      });
    });
  });

  // ties keep csv row order, since Array.prototype.sort is a stable sort
  flat.sort((a, b) => a.ratios[0] - b.ratios[0]);

  const n = flat.length;
  const base = Math.floor(n / 3);
  const extra = n % 3;
  const sizes = [base + (extra > 0 ? 1 : 0), base + (extra > 1 ? 1 : 0), base];

  const easy = flat.slice(0, sizes[0]);
  const medium = flat.slice(sizes[0], sizes[0] + sizes[1]);
  const hard = flat.slice(sizes[0] + sizes[1]);

  return { easy, medium, hard, easyMedium: easy.concat(medium) };
}

const DIFFICULTY_TIERS = buildDifficultyTiers();
