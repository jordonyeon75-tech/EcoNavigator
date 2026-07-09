<?php
// controller/updateStationStatus.php
header("Content-Type: application/json");

require_once '../config/database.php';

// Read JSON input
$input = json_decode(file_get_contents("php://input"), true);

if (!$input || !isset($input['id']) || !isset($input['status'])) {
    echo json_encode(["success" => false, "message" => "Invalid input"]);
    exit;
}

$stationId = intval($input['id']);
$stationName = isset($input['title']) ? trim($input['title']) : '';
$status = trim($input['status']);

try {
    // Connect to database using your OOP Database class
    $database = new Database();
    $db = $database->getConnection();

    // ✅ Helper function to reindex IDs sequentially (1,2,3,...)
    function reindexChargingStations($db)
    {
        try {
            $db->exec("
                CREATE TEMP TABLE temp_table AS
                SELECT station_name, status, station_id, updated_at
                FROM charging_stations
                ORDER BY id;
            ");
            $db->exec("DELETE FROM charging_stations;");
            $db->exec("
                INSERT INTO charging_stations (station_name, status, station_id, updated_at)
                SELECT station_name, status, station_id, updated_at FROM temp_table;
            ");
            $db->exec("DROP TABLE temp_table;");
            $db->exec("UPDATE SQLITE_SEQUENCE SET seq = (SELECT COUNT(*) FROM charging_stations) WHERE name='charging_stations';");
        } catch (Exception $e) {
            // Silent catch to prevent breaking main process
        }
    }

    if ($status === "Available") {
        // Remove record when station is restored to available
        $stmt = $db->prepare("DELETE FROM charging_stations WHERE station_id = :id");
        $stmt->execute(["id" => $stationId]);

        // ✅ Reindex IDs after delete
        reindexChargingStations($db);

        echo json_encode(["success" => true, "message" => "Station restored to Available (record removed and IDs reindexed)"]);
    } else {
        // Check if this station already exists in the table
        $check = $db->prepare("SELECT id FROM charging_stations WHERE station_id = :id");
        $check->execute(["id" => $stationId]);
        $exists = $check->fetch();

        if ($exists) {
            // Update existing record
            $stmt = $db->prepare("
                UPDATE charging_stations
                SET status = :status, station_name = :title, updated_at = CURRENT_TIMESTAMP
                WHERE station_id = :id
            ");
            $stmt->execute([
                "status" => $status,
                "title" => $stationName,
                "id" => $stationId
            ]);
        } else {
            // Insert new record
            $stmt = $db->prepare("
                INSERT INTO charging_stations (station_id, station_name, status)
                VALUES (:id, :title, :status)
            ");
            $stmt->execute([
                "id" => $stationId,
                "title" => $stationName,
                "status" => $status
            ]);
        }

        echo json_encode(["success" => true, "message" => "Station status saved successfully"]);
    }

} catch (Exception $e) {
    echo json_encode(["success" => false, "message" => "DB error: " . $e->getMessage()]);
}
?>