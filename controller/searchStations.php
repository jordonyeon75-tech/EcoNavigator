<?php
header('Content-Type: application/json; charset=utf-8');
require_once '../config/database.php';

$q = isset($_GET['q']) ? trim($_GET['q']) : '';
$lat = isset($_GET['lat']) ? floatval($_GET['lat']) : null;
$lon = isset($_GET['lon']) ? floatval($_GET['lon']) : null;

if (!$q) {
    echo json_encode([]);
    exit;
}

$results = [];

// ==========================================
// 1. LOCAL DATABASE SEARCH (Fastest)
// ==========================================
try {
    $database = new Database();
    $conn = $database->getConnection();
    if ($conn !== null) {
        $stmt = $conn->prepare("SELECT id, name, lat, lng, address FROM location WHERE name LIKE ? OR address LIKE ? LIMIT 10");
        $stmt->execute(["%$q%", "%$q%"]);
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $results[] = [
                "ID" => $row['id'],
                "AddressInfo" => [
                    "Title" => $row['name'],
                    "Latitude" => (float)$row['lat'],
                    "Longitude" => (float)$row['lng'],
                    "AddressLine1" => $row['address']
                ]
            ];
        }
    }
} catch (PDOException $e) {
    error_log("Database error: " . $e->getMessage());
}

// ==========================================
// 2. OPENCHARGEMAP (OCM) SEARCH
// ==========================================
$ocmKey = "e52e0fe4-6d46-48db-b854-707e9007dce1";
// Note: We limit to 50 results so the dropdown doesn't lag the browser
$ocmUrl = "https://api.openchargemap.io/v3/poi/?output=json&maxresults=50&compact=true&verbose=false&key=$ocmKey&query=" . urlencode($q);

$ocmData = @file_get_contents($ocmUrl);
if ($ocmData) {
    $ocmResults = json_decode($ocmData, true);
    if (is_array($ocmResults)) {
        foreach ($ocmResults as $station) {
            $results[] = [
                "ID" => $station['ID'],
                "AddressInfo" => [
                    "Title" => $station['AddressInfo']['Title'] ?? "Unknown",
                    "Latitude" => (float)($station['AddressInfo']['Latitude'] ?? 0),
                    "Longitude" => (float)($station['AddressInfo']['Longitude'] ?? 0),
                    "AddressLine1" => $station['AddressInfo']['AddressLine1'] ?? "No address"
                ]
            ];
        }
    }
}

// ==========================================
// 3. TOMTOM API SEARCH (Global Expansion)
// ==========================================
$tomtomKey = "CTk6JeXQZUCw0dkiB4670WHiSXhujiu9";
// categorySet=7309 forces TomTom to ONLY return Electric Vehicle Stations
$tomtomUrl = "https://api.tomtom.com/search/2/search/" . rawurlencode($q) . ".json?key=$tomtomKey&categorySet=7309&limit=15";

// If we have the user's map coordinates, we tell TomTom to prioritize stations near the map screen!
if ($lat !== null && $lon !== null) {
    $tomtomUrl .= "&lat=$lat&lon=$lon&radius=500000"; // 500km radius priority
}

$tomtomData = @file_get_contents($tomtomUrl);
if ($tomtomData) {
    $tomtomParsed = json_decode($tomtomData, true);
    if (isset($tomtomParsed['results']) && is_array($tomtomParsed['results'])) {
        foreach ($tomtomParsed['results'] as $tResult) {
            $results[] = [
                // We add "TT_" so IDs don't conflict with OCM
                "ID" => "TT_" . ($tResult['id'] ?? uniqid()),
                "AddressInfo" => [
                    "Title" => $tResult['poi']['name'] ?? "Charging Station",
                    "Latitude" => (float)($tResult['position']['lat'] ?? 0),
                    "Longitude" => (float)($tResult['position']['lon'] ?? 0),
                    "AddressLine1" => $tResult['address']['freeformAddress'] ?? "No address"
                ]
            ];
        }
    }
}

// Return the combined master list to your JS file!
echo json_encode($results);
?>