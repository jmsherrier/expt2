<?php
// woto_data/ next to the experiment page, created on first save. The data files carry participants'
// usernames, so the folder blocks direct web access (.htaccess, Apache). On Plesk, check that
// <site>/woto_data/ returns 403 in a browser -- if nginx serves static files directly, the
// .htaccess is skipped and the folder must be protected in Plesk (or moved outside httpdocs).
function dataDir() {
    $dir = __DIR__ . '/woto_data';
    if (!is_dir($dir)) {
        mkdir($dir, 0750, true);
    }
    if (!is_file($dir . '/.htaccess')) {
        file_put_contents($dir . '/.htaccess', "Require all denied\nOptions -Indexes\n");
    }
    return $dir;
}
