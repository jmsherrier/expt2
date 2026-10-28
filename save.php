<?php
// validated save endpoint: writes the posted csv text for one participant, overwriting in place
// every call (crash-safe "rewrite the whole file every trial" behavior). The filename is built from
// a whitelisted prefix and a server-validated username, never from an arbitrary client-supplied
// path: woto_data/<prefix>_<username>.csv

header('Content-Type: application/json');

const PREFIXES = ['woto', 'woto_test'];
const MAX_SESSION = 10;

$input = json_decode(file_get_contents('php://input'), true);

$subjectId = $input['subject_id'] ?? null;
$prefix = $input['prefix'] ?? null;
$session = filter_var($input['session'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => MAX_SESSION]]);
$csv = $input['csv'] ?? null;

if (!is_string($subjectId) || !preg_match('/^[A-Za-z0-9_-]{1,40}$/', $subjectId)
    || !in_array($prefix, PREFIXES, true) || $session === false || !is_string($csv)) {
    http_response_code(400);
    echo json_encode(['error' => 'invalid request']);
    exit;
}

require __DIR__ . '/data_dir.php';

$filename = sprintf('%s/%s_%s.csv', dataDir(), $prefix, $subjectId);
if (file_put_contents($filename, $csv) === false) {
    http_response_code(500);
    echo json_encode(['error' => 'write failed']);
    exit;
}

echo json_encode(['status' => 'ok']);
