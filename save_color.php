<?php
// validated save endpoint for the color calibration: writes the posted csv text for one
// participant, overwriting in place every call. Same crash-safe/path-traversal-safe pattern as
// save.php: woto_data/<prefix>_<username>_color.csv

header('Content-Type: application/json');

const PREFIXES = ['woto', 'woto_test'];

$input = json_decode(file_get_contents('php://input'), true);

$subjectId = $input['subject_id'] ?? null;
$prefix = $input['prefix'] ?? null;
$csv = $input['csv'] ?? null;

if (!is_string($subjectId) || !preg_match('/^[A-Za-z0-9_-]{1,40}$/', $subjectId)
    || !in_array($prefix, PREFIXES, true) || !is_string($csv)) {
    http_response_code(400);
    echo json_encode(['error' => 'invalid request']);
    exit;
}

require __DIR__ . '/data_dir.php';

$filename = sprintf('%s/%s_%s_color.csv', dataDir(), $prefix, $subjectId);
if (file_put_contents($filename, $csv) === false) {
    http_response_code(500);
    echo json_encode(['error' => 'write failed']);
    exit;
}

echo json_encode(['status' => 'ok']);
