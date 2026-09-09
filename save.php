<?php
// validated save endpoint: writes the posted csv text for one subject+session, overwriting in
// place every call (crash-safe "rewrite the whole file every trial" behavior). the filename is
// built entirely from server-validated integers -- never from a client-supplied string.
//
// MAX_SUBJECT_ID and DATA_PREFIX mirror the same-named constants in js/config.js; change them
// together here, in save_color.php, in progress.php, and in index.html's number input.

header('Content-Type: application/json');

const MAX_SUBJECT_ID = 10;
const MAX_SESSION = 10;
const DATA_PREFIX = 'MAFC2_EXPT';

$input = json_decode(file_get_contents('php://input'), true);

$subjectId = filter_var($input['subject_id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => MAX_SUBJECT_ID]]);
$session = filter_var($input['session'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => MAX_SESSION]]);
$csv = $input['csv'] ?? null;

if ($subjectId === false || $session === false || !is_string($csv)) {
    http_response_code(400);
    echo json_encode(['error' => 'invalid request']);
    exit;
}

$dataDir = __DIR__ . '/data';
if (!is_dir($dataDir)) {
    mkdir($dataDir, 0755, true);
}

$filename = sprintf('%s/%s_P%02d_S%02d.csv', $dataDir, DATA_PREFIX, $subjectId, $session);
file_put_contents($filename, $csv);

echo json_encode(['status' => 'ok']);
