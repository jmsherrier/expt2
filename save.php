<?php
// validated save endpoint: writes the posted csv text for one subject+session, overwriting in
// place every call (crash-safe "rewrite the whole file every trial" behavior). the filename is
// built from a server-validated trial label, never from an arbitrary client-supplied path.

header('Content-Type: application/json');

const MAX_SESSION = 10;
const DATA_PREFIX = 'MAFC2_EXPT';

$input = json_decode(file_get_contents('php://input'), true);

$subjectId = $input['subject_id'] ?? null;
$session = filter_var($input['session'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => MAX_SESSION]]);
$csv = $input['csv'] ?? null;

if (!is_string($subjectId) || !preg_match('/^[A-Za-z0-9_-]{1,40}$/', $subjectId) || $session === false || !is_string($csv)) {
    http_response_code(400);
    echo json_encode(['error' => 'invalid request']);
    exit;
}

$dataDir = __DIR__ . '/data';
if (!is_dir($dataDir)) {
    mkdir($dataDir, 0755, true);
}

$filename = sprintf('%s/%s_%s_S%02d.csv', $dataDir, DATA_PREFIX, $subjectId, $session);
file_put_contents($filename, $csv);

echo json_encode(['status' => 'ok']);
