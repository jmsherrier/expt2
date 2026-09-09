<?php
// validated progress-check endpoint: reports how many data rows already exist for each of a
// subject's session files (to resume mid-session, start the next fresh session, or report the
// study complete), plus the raw data lines themselves so a resumed session can carry them forward
// instead of the client's next save overwriting the file with only the post-resume trials, plus
// this subject's color-calibration rows, if any, so the client can rebuild calibration state
// (deriveColorCalibrationState in color_calibration.js) without its own CSV parser.

header('Content-Type: application/json');

const MAX_SUBJECT_ID = 10;
const DATA_PREFIX = 'MAFC2_EXPT';

$subjectId = filter_var($_GET['subject_id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => MAX_SUBJECT_ID]]);

if ($subjectId === false) {
    http_response_code(400);
    echo json_encode(['error' => 'invalid subject_id']);
    exit;
}

$dataDir = __DIR__ . '/data';
$pattern = sprintf('%s/%s_P%02d_S??.csv', $dataDir, DATA_PREFIX, $subjectId);

$sessions = [];
foreach (glob($pattern) as $file) {
    if (preg_match('/_S(\d{2})\.csv$/', $file, $matches)) {
        $lines = file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        array_shift($lines); // drop header
        $sessions[] = ['session' => (int)$matches[1], 'rows' => count($lines), 'lines' => $lines];
    }
}

// COLOR_CSV_HEADER in config.js, kept in the same order here since no CSV parser exists client-side
$colorColumns = ['date', 'time', 'sid', 'seed', 'trial', 'gain_red', 'gain_green', 'gain_blue', 'gain_yellow'];
$colorFile = sprintf('%s/%s_P%02d_COLOR.csv', $dataDir, DATA_PREFIX, $subjectId);

$colorRows = [];
if (is_file($colorFile)) {
    $lines = file($colorFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    array_shift($lines); // drop header
    foreach ($lines as $line) {
        $colorRows[] = array_combine($colorColumns, explode(',', $line));
    }
}

echo json_encode(['sessions' => $sessions, 'color_rows' => $colorRows]);
