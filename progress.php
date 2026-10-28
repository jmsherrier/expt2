<?php
// validated progress-check endpoint: reports how many data rows already exist in this participant's
// file (to resume mid-session, or report the study complete), plus the raw data lines themselves so
// a resumed session can carry them forward instead of the client's next save overwriting the file
// with only the post-resume trials, plus the participant's color-calibration rows, if any, so the
// client can rebuild calibration state (deriveColorCalibrationState in color_calibration.js). The
// study is a single session, so the one data file is reported as session 1.

header('Content-Type: application/json');

const PREFIXES = ['woto', 'woto_test'];

$subjectId = $_GET['subject_id'] ?? null;
$prefix = $_GET['prefix'] ?? null;

if (!is_string($subjectId) || !preg_match('/^[A-Za-z0-9_-]{1,40}$/', $subjectId) || !in_array($prefix, PREFIXES, true)) {
    http_response_code(400);
    echo json_encode(['error' => 'invalid request']);
    exit;
}

require __DIR__ . '/data_dir.php';

$sessions = [];
$dataFile = sprintf('%s/%s_%s.csv', dataDir(), $prefix, $subjectId);
if (is_file($dataFile)) {
    $lines = file($dataFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    array_shift($lines); // drop header
    $sessions[] = ['session' => 1, 'rows' => count($lines), 'lines' => $lines];
}

// COLOR_CSV_HEADER in config.js, kept in the same order here since no CSV parser exists client-side
$colorColumns = ['date', 'time', 'sid', 'seed', 'trial', 'gain_orange', 'gain_green', 'gain_blue', 'gain_magenta'];
$colorFile = sprintf('%s/%s_%s_color.csv', dataDir(), $prefix, $subjectId);

$colorRows = [];
if (is_file($colorFile)) {
    $lines = file($colorFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    array_shift($lines); // drop header
    foreach ($lines as $line) {
        $colorRows[] = array_combine($colorColumns, explode(',', $line));
    }
}

echo json_encode(['sessions' => $sessions, 'color_rows' => $colorRows]);
