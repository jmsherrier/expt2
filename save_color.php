<?php
// validated save endpoint for the color-matching calibration: writes the posted csv text for one
// subject, overwriting in place every call. same crash-safe/path-traversal-safe pattern as
// save.php, just without the session number (calibration runs once per subject, not per session).

header('Content-Type: application/json');

const MAX_SUBJECT_ID = 10;
const DATA_PREFIX = 'MAFC2_EXPT';

$input = json_decode(file_get_contents('php://input'), true);

$subjectId = filter_var($input['subject_id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => MAX_SUBJECT_ID]]);
$csv = $input['csv'] ?? null;

if ($subjectId === false || !is_string($csv)) {
    http_response_code(400);
    echo json_encode(['error' => 'invalid request']);
    exit;
}

$dataDir = __DIR__ . '/data';
if (!is_dir($dataDir)) {
    mkdir($dataDir, 0755, true);
}

$filename = sprintf('%s/%s_P%02d_COLOR.csv', $dataDir, DATA_PREFIX, $subjectId);
file_put_contents($filename, $csv);

echo json_encode(['status' => 'ok']);
