<?php
// validated save endpoint for the color-matching calibration: writes the posted csv text for one
// subject, overwriting in place every call. same crash-safe/path-traversal-safe pattern as
// save.php, just without the session number (calibration runs once per subject, not per session).

header('Content-Type: application/json');

const DATA_PREFIX = 'MAFC2_EXPT';

$input = json_decode(file_get_contents('php://input'), true);

$subjectId = $input['subject_id'] ?? null;
$csv = $input['csv'] ?? null;

if (!is_string($subjectId) || !preg_match('/^[A-Za-z0-9_-]{1,40}$/', $subjectId) || !is_string($csv)) {
    http_response_code(400);
    echo json_encode(['error' => 'invalid request']);
    exit;
}

$dataDir = __DIR__ . '/data';
if (!is_dir($dataDir)) {
    mkdir($dataDir, 0755, true);
}

$filename = sprintf('%s/%s_%s_COLOR.csv', $dataDir, DATA_PREFIX, $subjectId);
file_put_contents($filename, $csv);

echo json_encode(['status' => 'ok']);
