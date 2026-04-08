<?php
header('Content-Type: application/json; charset=utf-8');
require_once '../config/database.php';

$filters = json_decode(file_get_contents('php://input'), true) ?? [];
$country    = trim($filters['country'] ?? '');
$usage      = trim($filters['usage'] ?? '');
$status     = trim($filters['status'] ?? '');
$connection = trim($filters['connection'] ?? '');

$results = [];

// --- 1. OPENCHARGEMAP (OCM) ---
$ocmKey = "e52e0fe4-6d46-48db-b854-707e9007dce1";
$apiUrl = "https://api.openchargemap.io/v3/poi/?output=json";
if ($country) {
    $apiUrl .= "&countrycode=" . urlencode($country);
}
// Reduce maxresults slightly to improve performance since we are combining APIs
$apiUrl .= "&maxresults=5000&compact=false&verbose=true&key=" . urlencode($ocmKey);

$raw = @file_get_contents($apiUrl);
if ($raw) {
    $apiData = json_decode($raw, true);
    if (is_array($apiData)) {
        $database = new Database();
        $db = $database->getConnection();
        $statusMap = [];
        $stmt = $db->query("SELECT station_id, status FROM charging_stations");
        while ($r = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $statusMap[$r['station_id']] = $r['status'];
        }

        foreach ($apiData as $s) {
            $addr = $s['AddressInfo'] ?? null;
            if (!$addr) continue;

            $ocmStatus = $s['StatusType']['Title'] ?? '';
            $adminStatus = $statusMap[$s['ID']] ?? 'Available';
            $finalStatus = $adminStatus ?: $ocmStatus;

            if ($usage && stripos($s['UsageType']['Title'] ?? '', $usage) === false) continue;
            if ($status && stripos($finalStatus, $status) === false) continue;

            if ($connection) {
                $found = false;
                foreach ($s['Connections'] ?? [] as $c) {
                    if (stripos($c['ConnectionType']['Title'] ?? '', $connection) !== false) {
                        $found = true; break;
                    }
                }
                if (!$found) continue;
            }

            $results[] = [
                'id' => $s['ID'] ?? null,
                'title' => $addr['Title'] ?? "Unknown",
                'address' => $addr['AddressLine1'] ?? $addr['Town'] ?? "Unknown",
                'lat' => (float)($addr['Latitude'] ?? 0),
                'lon' => (float)($addr['Longitude'] ?? 0),
                'status' => $finalStatus
            ];
        }
    }
}

// --- 2. TOMTOM API ---
// We only query TomTom if the connection/usage filters aren't super specific,
// since TomTom POI data doesn't provide granular plug type or usage info easily.
if (empty($connection) && empty($usage)) {
    $tomtomKey = "CTk6JeXQZUCw0dkiB4670WHiSXhujiu9";
    // Category 7309 = EV Station
    $tomtomUrl = "https://api.tomtom.com/search/2/poiSearch/EV.json?key=$tomtomKey&categorySet=7309&limit=100";

    // If a country is selected, filter by it (TomTom uses 2-letter ISO codes)
    if ($country) {
        $tomtomUrl .= "&countrySet=" . urlencode($country);
    }

    $ttRaw = @file_get_contents($tomtomUrl);
    if ($ttRaw) {
        $ttData = json_decode($ttRaw, true);
        if (isset($ttData['results']) && is_array($ttData['results'])) {
            foreach ($ttData['results'] as $t) {
                // If the user filtered by status, and it's not "Available", skip (TomTom doesn't give live status in this endpoint)
                if ($status && stripos("Available", $status) === false) continue;

                $results[] = [
                    'id' => "TT_" . ($t['id'] ?? uniqid()),
                    'title' => $t['poi']['name'] ?? "Charging Station",
                    'address' => $t['address']['freeformAddress'] ?? "Unknown",
                    'lat' => (float)($t['position']['lat'] ?? 0),
                    'lon' => (float)($t['position']['lon'] ?? 0),
                    'status' => 'Available' // Default assumption for basic POI
                ];
            }
        }
    }
}

echo json_encode($results);
?>