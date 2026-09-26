const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const files = [
  'js/colors.js',
  'js/conditions.js',
  'js/rng.js',
  'js/permutations.js',
  'js/config.js',
  'js/triallist.js',
];
vm.runInThisContext(files.map(file => fs.readFileSync(file, 'utf8')).join('\n'));

const subjects = [1, 5, 10];
subjects.forEach(subjectId => {
  const first = buildSubjectSessions(subjectId);
  const second = buildSubjectSessions(subjectId);
  assert.deepEqual(second, first, `subject ${subjectId} is not reproducible`);

  first.forEach((session, sessionIndex) => {
    assert.equal(session.length, SESSION_SIZE, `subject ${subjectId} session ${sessionIndex + 1} has the wrong size`);

    const durationCounts = new Map(STIMULUS_DURATIONS.map(duration => [duration, 0]));
    const cells = new Map();
    const conditions = new Map();
    session.forEach(trial => {
      durationCounts.set(trial.duration, durationCounts.get(trial.duration) + 1);
      const key = `${trial.n_choice}:${trial.condition_id}:${trial.correct_color}`;
      if (!cells.has(key)) cells.set(key, new Map(STIMULUS_DURATIONS.map(duration => [duration, 0])));
      cells.get(key).set(trial.duration, cells.get(key).get(trial.duration) + 1);
      const condKey = `${trial.n_choice}:${trial.condition_id}`;
      if (!conditions.has(condKey)) conditions.set(condKey, new Map(STIMULUS_DURATIONS.map(duration => [duration, 0])));
      conditions.get(condKey).set(trial.duration, conditions.get(condKey).get(trial.duration) + 1);
    });

    const expectedOverall = session.length / STIMULUS_DURATIONS.length;
    STIMULUS_DURATIONS.forEach(duration => {
      assert.equal(durationCounts.get(duration), expectedOverall,
        `subject ${subjectId} session ${sessionIndex + 1} duration ${duration} is unbalanced overall`);
    });
    cells.forEach((counts, key) => {
      const values = STIMULUS_DURATIONS.map(duration => counts.get(duration));
      assert.ok(Math.max(...values) - Math.min(...values) <= 1,
        `subject ${subjectId} session ${sessionIndex + 1} cell ${key} is unbalanced`);
    });
    // each condition's own reps split evenly across durations when that count is even (it always
    // is while N_REPS is even) -- assignBalancedDurations's correctionKeyFn targets this exactly,
    // not just the session-wide total
    conditions.forEach((counts, condKey) => {
      const total = STIMULUS_DURATIONS.reduce((sum, d) => sum + counts.get(d), 0);
      if (total % STIMULUS_DURATIONS.length !== 0) return;
      const expected = total / STIMULUS_DURATIONS.length;
      STIMULUS_DURATIONS.forEach(duration => {
        assert.equal(counts.get(duration), expected,
          `subject ${subjectId} session ${sessionIndex + 1} condition ${condKey} is unbalanced across durations`);
      });
    });
  });
});

console.log(`Duration verification passed for subjects ${subjects.join(', ')}.`);
