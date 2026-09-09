// builds all sessions' worth of trials for one subject, deterministically from their seed.
// structurally the same as the previous experiment's builder -- balance condition reps across
// sessions, then balance correct-color counts within each session -- with two changes forced by
// this design:
//
//   1. choice sizes come from N_CHOICE_SIZES (conditions.js), which is [3, 4] here. no
//      two-choice conditions.
//   2. the per-condition permutation cycle is REFILLED when exhausted. the previous experiment
//      handed each condition only 9-10 trials per session, always fewer than the 24 available
//      colour permutations, so a single shuffled cycle always sufficed. this design has 8
//      conditions instead of 75, so each one gets 90 trials per session -- the cycle runs out
//      partway through and has to be reshuffled, exactly as buildPracticeTriallistFromPool
//      already does below. without the refill the color picker would run off the end of an empty
//      list and throw.
function assignBalancedDurations(trials, keyFn, rng) {
  const groups = {};
  trials.forEach(trial => {
    const key = keyFn(trial);
    if (!groups[key]) groups[key] = [];
    groups[key].push(trial);
  });

    const oddGroups = [];
    Object.values(groups).forEach(group => {
      const durations = Array.from({ length: group.length }, (_, i) =>
        STIMULUS_DURATIONS[i % STIMULUS_DURATIONS.length]);
      shuffle(durations, rng);
      if (group.length % STIMULUS_DURATIONS.length !== 0) oddGroups.push({ group, durations });
      group.forEach((trial, i) => { trial.duration = durations[i]; });
    });

    // For the two-level manipulation, distribute odd-cell extras across levels so a divisible
    // session remains exactly half at each duration instead of inheriting one level's remainder.
    if (STIMULUS_DURATIONS.length === 2) {
      const firstDuration = STIMULUS_DURATIONS[0];
      const firstCount = trials.filter(trial => trial.duration === firstDuration).length;
      const targetFirst = Math.floor(trials.length / STIMULUS_DURATIONS.length);
      const groupsToSwap = firstCount - targetFirst;
      shuffle(oddGroups, rng);
      oddGroups.slice(0, groupsToSwap).forEach(({ group }) => {
        group.forEach(trial => {
          trial.duration = trial.duration === firstDuration
            ? STIMULUS_DURATIONS[1] : firstDuration;
        });
      });
    }
  }

function buildSubjectSessions(subjectId) {
  const seed = SUBJECT_SEEDS[subjectId];
  const rng = mulberry32(seed);
  console.log(`subject ${subjectId}, seed ${seed}`);

  const sessions = Array.from({ length: N_SESSIONS }, () => []);
  const sessionTotals = new Array(N_SESSIONS).fill(0);
  const sessionColorCounts = Array.from({ length: N_SESSIONS }, () => ({ red: 0, green: 0, blue: 0, yellow: 0 }));

  // groups a list of permutations by their rank-0 (correct) color
  const groupByCorrectColor = perms => {
    const byColor = { red: [], green: [], blue: [], yellow: [] };
    perms.forEach(perm => byColor[perm[0]].push(perm));
    return byColor;
  };

  N_CHOICE_SIZES.forEach(nChoice => {
    const cycle = permutations(COLOR_NAMES, nChoice);

    CONDITIONS[nChoice].forEach((cond, conditionId) => {
      // how many of this condition's N_REPS land in each session -- the remainder is handed to
      // whichever sessions currently hold the fewest total trials
      const base = Math.floor(N_REPS / N_SESSIONS);
      const extra = N_REPS % N_SESSIONS;
      const priority = argsortAscending(sessionTotals);
      const extraSessions = new Set(priority.slice(0, extra));

      for (let s = 0; s < N_SESSIONS; s++) {
        const k = base + (extraSessions.has(s) ? 1 : 0);
        sessionTotals[s] += k;

        // walk a shuffled permutation cycle grouped by rank-0 (correct) color, greedily handing
        // each trial to whichever color is currently most under-represented in this session --
        // keeps every session's correct-color counts within 1 of each other at every step, so
        // after 720 trials (divisible by 4) they land at exactly 180 each. the cycle is
        // reshuffled from scratch whenever every color's bucket is empty, so each full sweep of
        // the 24 permutations is used once before any of them repeats.
        let byColor = groupByCorrectColor(shuffle(cycle.slice(), rng));

        for (let t = 0; t < k; t++) {
          let available = COLOR_NAMES.filter(c => byColor[c].length > 0);
          if (available.length === 0) {
            byColor = groupByCorrectColor(shuffle(cycle.slice(), rng));
            available = COLOR_NAMES.filter(c => byColor[c].length > 0);
          }

          available = shuffle(available, rng);
          const color = available.reduce((best, c) =>
            (sessionColorCounts[s][c] < sessionColorCounts[s][best] ? c : best), available[0]);
          const perm = byColor[color].pop();
          sessionColorCounts[s][color] += 1;

          sessions[s].push({
          n_choice: nChoice, condition_id: conditionId, top: cond.top, ratios: cond.ratios,
          colors: perm.slice(), counts: cond.counts.slice(), correct_color: perm[0], session: s + 1,
          });
        }
      }
    });
  });

  // balance duration inside each condition/color cell before order randomization, so the factor
  // cannot become correlated with either the condition or the correct response color
  sessions.forEach((session, s) => {
    assignBalancedDurations(session, trial => `${trial.n_choice}:${trial.condition_id}:${trial.correct_color}`, rng);
    shuffle(session, rng);
    const durationCounts = {};
    session.forEach(trial => { durationCounts[trial.duration] = (durationCounts[trial.duration] || 0) + 1; });
    console.log(`subject ${subjectId}, session ${s + 1}, duration counts`, durationCounts);
  });
  return sessions;
}

// distributes `total` items across `nBuckets` as evenly as possible, remainder handed to the
// first buckets -- same divmod idiom used throughout this file
function distributeCounts(total, nBuckets) {
  const base = Math.floor(total / nBuckets);
  const extra = total % nBuckets;
  return Array.from({ length: nBuckets }, (_, i) => base + (i < extra ? 1 : 0));
}

// practice trials drawn from a difficulty-tier condition pool (DIFFICULTY_TIERS in conditions.js):
// nTotal trials split evenly across whichever choice-sizes are present in the pool, then spread
// across that choice-size's pool conditions (round-robin over a shuffled order). colors are
// assigned via a shuffled permutation cycle shared across the whole choice-size group, reshuffled
// whenever exhausted, keeping the block close to color-balanced without requiring reps to be a
// multiple of the cycle length.
//
// note this design's pools are small (3 conditions in easy, 3 in medium, 6 in easy+medium), so
// unlike the previous experiment a practice block now repeats each pooled condition several
// times rather than sampling distinct ones -- unavoidable with 8 conditions total, and harmless
// since practice is never saved.
function buildPracticeTriallistFromPool(nTotal, pool, rng) {
  const choiceSizes = shuffle(N_CHOICE_SIZES.filter(n => pool.some(c => c.n_choice === n)), rng);
  const countsByChoice = {};
  distributeCounts(nTotal, choiceSizes.length).forEach((count, i) => { countsByChoice[choiceSizes[i]] = count; });

  let trials = [];
  choiceSizes.forEach(nChoice => {
    const total = countsByChoice[nChoice];
    if (total === 0) return;

    const conditionOrder = shuffle(pool.filter(c => c.n_choice === nChoice), rng);
    const perConditionCounts = distributeCounts(total, conditionOrder.length);
    let colorCycle = [];

    conditionOrder.forEach((cond, i) => {
      const reps = perConditionCounts[i];
      for (let r = 0; r < reps; r++) {
        if (colorCycle.length === 0) colorCycle = shuffle(permutations(COLOR_NAMES, nChoice), rng);
        const colors = colorCycle.pop();
        trials.push({
          n_choice: nChoice, condition_id: cond.condition_id, top: cond.top, ratios: cond.ratios,
          colors: colors.slice(), counts: cond.counts.slice(), correct_color: colors[0],
        });
      }
    });
  });

  assignBalancedDurations(trials, trial => `${trial.n_choice}:${trial.condition_id}`, rng);

  shuffle(trials, rng);
  return trials;
}

// day-1 (first-ever session) practice: 20 easy-tier trials w/ feedback, 20 medium-tier w/
// feedback, then 20 easy+medium mixed w/o feedback -- 60 total. this is the only practice path
// that runs while N_SESSIONS is 1.
function buildDay1PracticeBlocks(rng) {
  return [
    { trials: buildPracticeTriallistFromPool(N_PRACTICE_EASY_DAY1, DIFFICULTY_TIERS.easy, rng), feedback: true },
    { trials: buildPracticeTriallistFromPool(N_PRACTICE_MEDIUM_DAY1, DIFFICULTY_TIERS.medium, rng), feedback: true },
    { trials: buildPracticeTriallistFromPool(N_PRACTICE_MIXED_DAY1, DIFFICULTY_TIERS.easyMedium, rng), feedback: false },
  ];
}

// every later session's practice: 20 easy+medium mixed w/ feedback, then 20 more w/o feedback --
// 40 total. unreachable while N_SESSIONS is 1; kept so raising that constant needs no other edit.
function buildRepeatPracticeBlocks(rng) {
  return [
    { trials: buildPracticeTriallistFromPool(N_PRACTICE_MIXED_REPEAT, DIFFICULTY_TIERS.easyMedium, rng), feedback: true },
    { trials: buildPracticeTriallistFromPool(N_PRACTICE_MIXED_REPEAT, DIFFICULTY_TIERS.easyMedium, rng), feedback: false },
  ];
}
