function rowToCsvLine(row) {
  const fields = [
    row.date, row.time, row.sid, row.seed,
    row.gain_red, row.gain_green, row.gain_blue, row.gain_yellow,
    row.session, row.trial, row.duration,
    row.n_choice, row.condition_id, row.top, row.ratio_1, row.ratio_2, row.ratio_3,
    `[${row.colors.join(',')}]`, `[${row.counts.join(',')}]`,
    row.stim, row.resp, row.acc, row.rt, row.conf, row.c_rt,
  ];
  return fields.map(csvField).join(',');
}

// builds the saved-data row for one trial, mirrors the pilot's get_trial_info column-for-column
// plus session/gain columns, with conf/c_rt populated (unlike the pilot, which always leaves them
// blank). gains are this subject's resolved color-calibration result, constant across a session
function buildTrialInfo(trial, result, subjectId, seed, trialIndex, gains) {
  const now = new Date();
  const ratios = [null, null, null];
  trial.ratios.forEach((r, i) => { ratios[i] = r; });

  return {
    date: formatDate(now), time: formatTime(now),
    sid: subjectId, seed: seed,
    gain_red: gains.red, gain_green: gains.green, gain_blue: gains.blue, gain_yellow: gains.yellow,
    session: trial.session, trial: trialIndex, duration: trial.duration,
    n_choice: trial.n_choice, condition_id: trial.condition_id, top: trial.top,
    ratio_1: ratios[0] ?? '', ratio_2: ratios[1] ?? '', ratio_3: ratios[2] ?? '',
    colors: trial.colors.map(c => COLOR_CODES[c]),
    counts: trial.counts,
    stim: COLOR_CODES[trial.correct_color],
    resp: COLOR_CODES[result.resp],
    acc: result.acc, rt: result.rt, conf: result.conf, c_rt: result.c_rt,
  };
}

// re-posts the WHOLE accumulated session so far after every trial, overwriting the file in place
// server-side -- same crash-safe philosophy as the pilot's save_trial_data. enqueueSave (in
// expt_util.js) adds retry-with-backoff and write-ordering on top of the plain fetch this used to be.
// sessionData holds already-formatted CSV lines (see buildMainTimeline/runSession), not row objects,
// so a resumed session's carried-forward lines (from progress.php) can sit alongside freshly-built
// ones without re-parsing anything
function saveSessionData(subjectId, session, sessionData) {
  const csvText = CSV_HEADER + '\n' + sessionData.join('\n');
  return enqueueSave('save.php', { subject_id: subjectId, session, csv: csvText });
}

// filename stem comes from DATA_PREFIX (config.js) rather than being hard-coded, so the client
// download and the three php endpoints can't drift apart
function sessionDataFilename(subjectId, session) {
  return `${DATA_PREFIX}_P${String(subjectId).padStart(2, '0')}_S${String(session).padStart(2, '0')}.csv`;
}

async function fetchProgress(subjectId) {
  const res = await fetch(`progress.php?subject_id=${subjectId}`);
  const body = await res.text();
  try {
    return JSON.parse(body);
  } catch (error) {
    if (!['localhost', '127.0.0.1'].includes(location.hostname)) throw error;
    return { sessions: [], color_rows: [] };
  }
}

// decides what to run next from the server's report of existing session files: resume a
// partially-saved session (crash recovery, skips to the first unsaved trial), move on to the
// next fresh session, or report the study complete. resumeLines carries forward the raw CSV lines
// already on disk for a resumed session (progress.php now returns them, not just a row count) --
// without this, saveSessionData would overwrite the file with only the post-resume trials and
// silently discard every row saved before the crash
function resolveSessionPlan(progress) {
  const bySession = {};
  progress.sessions.forEach(s => { bySession[s.session] = s; });

  for (let s = N_SESSIONS; s >= 1; s--) {
    if (bySession[s] !== undefined && bySession[s].rows < SESSION_SIZE) {
      return { status: 'run', session: s, resumeFromTrial: bySession[s].rows, isFirstSession: s === 1, resumeLines: bySession[s].lines };
    }
  }

  const completeSessions = Object.keys(bySession).map(Number).filter(s => bySession[s].rows >= SESSION_SIZE);
  const nextSession = completeSessions.length ? Math.max(...completeSessions) + 1 : 1;

  if (nextSession > N_SESSIONS) return { status: 'done' };
  return { status: 'run', session: nextSession, resumeFromTrial: 0, isFirstSession: nextSession === 1, resumeLines: [] };
}

// shown before the virtual chinrest every session, including resumed ones -- chinrestTrial()
// itself always runs regardless of resumeFromTrial, so this intro runs alongside it every time
function chinrestIntroTrial(isFirstSession) {
  return {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: isFirstSession ? CHINREST_INTRO_TEXT_FIRST : CHINREST_INTRO_TEXT_RETURNING,
    choices: [' '],
  };
}

function transitionMessageTrial() {
  return { type: jsPsychHtmlKeyboardResponse, stimulus: buildTransitionText(), choices: 'ALL_KEYS' };
}

// countdown text is updated live via on_load/setInterval since html-keyboard-response's stimulus
// is static markup -- interval is cleared on_finish whether the trial ends via timeout or the
// subject skipping early with spacebar. percent complete is relative to the whole session
// (SESSION_SIZE), not just the remaining trials passed into buildMainTimeline
function buildBreakTimeline(trialIndex) {
  const percentComplete = Math.round((trialIndex / SESSION_SIZE) * 100);
  // trialIndex is always a multiple of N_TRIAL_TO_BREAK here (that's the trigger condition at the
  // call site), so blocksCompleted is exact -- runs/blocks are both reported 1-indexed
  const blocksCompleted = trialIndex / N_TRIAL_TO_BREAK;
  const currentRun = Math.ceil(blocksCompleted / BLOCKS_PER_RUN);
  const blockInRun = ((blocksCompleted - 1) % BLOCKS_PER_RUN) + 1;
  let countdownInterval = null;

  return [
    {
      type: jsPsychHtmlKeyboardResponse,
      stimulus: `
        <p id="break-timer" style="font-size:4em;">${BREAK_DURATION}</p>
        <p>Great, you've completed ${percentComplete}% of the trials for today, time to take a break.</p>
        <p>If you wish to continue without a break, press spacebar.</p>
      `,
      choices: [' '],
      trial_duration: BREAK_DURATION * 1000,
      on_load: function () {
        let remaining = BREAK_DURATION;
        const timerEl = document.getElementById('break-timer');
        countdownInterval = setInterval(function () {
          remaining -= 1;
          timerEl.textContent = Math.max(remaining, 0);
        }, 1000);
      },
      on_finish: function () {
        clearInterval(countdownInterval);
      },
    },
    {
      type: jsPsychHtmlKeyboardResponse,
      stimulus: `
        <p>Press spacebar to continue to the next block.</p>
        <p>RUN: ${currentRun}/${RUNS_PER_SESSION}</p>
        <p>BLOCK: ${blockInRun}/${BLOCKS_PER_RUN}</p>
      `,
      choices: [' '],
    },
  ];
}

// practice trials always include confidence (the main experiment never skips it, unlike the
// pilot's pilot=True flag) and are never saved to disk -- same convention as the pilot. feedback is
// a per-block flag (see buildDay1PracticeBlocks/buildRepeatPracticeBlocks in triallist.js), since
// some practice blocks are run without it
function buildPracticeTimeline(trials, feedback) {
  const nodes = [];
  trials.forEach(trial => {
    const result = {};
    nodes.push(makeFixationTrial());
    nodes.push(makeStimulusTrial(trial));
    nodes.push(makeMaskTrial());
    nodes.push(makeDecisionTrial(trial, result));
    nodes.push(makeConfidenceTrial(result));
    if (feedback) nodes.push(makeFeedbackTrial(trial, result));
  });
  return nodes;
}

// main trials: no feedback, confidence enabled, saved after every trial. startIndex lets a
// resumed session continue the `trial` column where the last save left off. `calibState` is read
// at on_finish time (not build time), so it always reflects this subject's resolved color gains
// even though calibration finishes later in the same timeline than this function is called
function buildMainTimeline(trials, subjectId, seed, session, sessionData, startIndex, calibState) {
  const nodes = [];
  trials.forEach((trial, i) => {
    const trialIndex = startIndex + i;
    if (trialIndex > 0 && trialIndex % N_TRIAL_TO_BREAK === 0) {
      nodes.push(...buildBreakTimeline(trialIndex));
    }

    const result = {};
    nodes.push(makeFixationTrial());
    nodes.push(makeStimulusTrial(trial));
    nodes.push(makeMaskTrial());
    nodes.push(makeDecisionTrial(trial, result));
    nodes.push(makeConfidenceTrial(result, function () {
      sessionData.push(rowToCsvLine(buildTrialInfo(trial, result, subjectId, seed, trialIndex, calibState.gains)));
      saveSessionData(subjectId, session, sessionData);
    }));
  });
  return nodes;
}

// local-backup screen shown at the end of every session, after the server save (enqueueSave, with
// its own retries) has settled -- gives the subject their own copy on disk regardless of whether
// the server-side copy succeeded. choices: 'NO_KEYS' plus a manual jsPsych.finishTrial() from the
// button (same pattern as makeCalibrationRepTrial's confirm button) means the trial can't be
// skipped without actually triggering the download
function buildLocalSaveTrial(subjectId, session, sessionData) {
  return {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `
      <p>${LOCAL_SAVE_PROMPT_TEXT}</p>
      <button id="local-save-btn" style="font-size:1.1em; padding:8px 24px;">Save Data to Computer</button>
    `,
    choices: 'NO_KEYS',
    data: { phase: 'local_save_prompt' },
    on_load: function () {
      document.getElementById('local-save-btn').addEventListener('click', function () {
        const csvText = CSV_HEADER + '\n' + sessionData.join('\n');
        downloadCsvText(sessionDataFilename(subjectId, session), csvText);
        jsPsych.finishTrial();
      });
    },
  };
}

// waits for the server save to settle (success or every retry exhausted, see enqueueSave), reports
// failure plainly instead of the old behavior of proceeding either way, then always prompts a local
// download as a backup -- saveStatus is read by the next trial's stimulus function, which only runs
// after this callFunction trial has already finished
function sessionCompleteTimeline(subjectId, session, sessionData) {
  const saveStatus = { ok: true };
  return [
    {
      type: jsPsychCallFunction,
      async: true,
      func: function (done) {
        lastSaveResponse.then(() => { saveStatus.ok = true; done(); })
          .catch(() => { saveStatus.ok = false; done(); });
      },
    },
    {
      type: jsPsychHtmlKeyboardResponse,
      stimulus: function () { return saveStatus.ok ? SESSION_COMPLETE_TEXT : SAVE_FAILED_TEXT; },
      choices: 'NO_KEYS',
      trial_duration: 4000,
      data: { phase: 'session_complete' },
    },
    buildLocalSaveTrial(subjectId, session, sessionData),
  ];
}

function showCompletionScreen() {
  document.getElementById('jspsych-target').innerHTML = STUDY_COMPLETE_TEXT;
}

function chinrestTrial() {
  return {
    type: jsPsychVirtualChinrest,
    blindspot_reps: 3,
    // resize_units 'none' skips the plugin's own CSS transform: scale() on the content
    // container -- this codebase already converts degrees to pixels itself via getPxPerDeg(),
    // so letting the plugin ALSO rescale the container would double-scale every stimulus
    resize_units: 'none',
    pixels_per_unit: 30,
    item_path: 'img/card.png',
    viewing_distance_report: 'none',
  };
}

// calibState resolves this subject's color gains: derived from any saved _COLOR.csv rows (see
// deriveColorCalibrationState). If already complete (a prior session finished it, or this session
// crashed after finishing it), the gains are activated up front and the calibration block is
// skipped entirely; otherwise the calibration timeline is inserted before instructions/practice,
// resuming from the next unrun rep if some reps were already saved. resumeLines is the raw CSV
// lines already on disk for this session (empty for a fresh session) -- seeding sessionData with
// them is what keeps a resumed session's first save from clobbering the pre-crash rows
function runSession(subjectId, sessionNumber, resumeFromTrial, isFirstSession, calibState, resumeLines) {
  const seed = SUBJECT_SEEDS[subjectId];
  const allSessions = buildSubjectSessions(subjectId);
  const sessionTrials = allSessions[sessionNumber - 1];
  const trialsToRun = sessionTrials.slice(resumeFromTrial);

  // skip practice entirely when resuming mid-session after a crash -- only run it at the start
  // of a fresh session
  const practiceBlocks = resumeFromTrial === 0
    ? (isFirstSession ? buildDay1PracticeBlocks(mulberry32(seed + 1)) : buildRepeatPracticeBlocks(mulberry32(seed + 1)))
    : [];

  const sessionData = [...resumeLines];
  const timeline = [];

  timeline.push({ type: jsPsychFullscreen, fullscreen_mode: true });
  timeline.push(chinrestIntroTrial(isFirstSession));
  timeline.push(chinrestTrial());

  if (calibState.complete) {
    setActiveColors(calibState.gains);
  } else {
    timeline.push(...buildColorCalibrationTimeline(calibState, subjectId, seed));
  }

  timeline.push(mainInstructionsTrial(isFirstSession));
  practiceBlocks.forEach(block => timeline.push(...buildPracticeTimeline(block.trials, block.feedback)));
  if (practiceBlocks.length) timeline.push(transitionMessageTrial());
  timeline.push(...buildMainTimeline(trialsToRun, subjectId, seed, sessionNumber, sessionData, resumeFromTrial, calibState));
  timeline.push(...sessionCompleteTimeline(subjectId, sessionNumber, sessionData));
  timeline.push({ type: jsPsychFullscreen, fullscreen_mode: false });

  jsPsych.run(timeline);
}

async function startExperiment(subjectId) {
  const progress = await fetchProgress(subjectId);
  const plan = resolveSessionPlan(progress);
  const calibState = deriveColorCalibrationState(progress.color_rows || []);

  document.getElementById('subject-entry').style.display = 'none';
  document.getElementById('jspsych-target').style.display = 'block';

  if (plan.status === 'done') {
    showCompletionScreen();
    return;
  }

  runSession(subjectId, plan.session, plan.resumeFromTrial, plan.isFirstSession, calibState, plan.resumeLines || []);
}
