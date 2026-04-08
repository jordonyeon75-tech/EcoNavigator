<?php

// controller/getStationStatus.php
header('Content-Type: application/json');
require_once '../config/database.php';

try {
    $database = new Database();
    $db = $database->getConnection();

    $stmt = $db->prepare("SELECT station_id, status FROM charging_stations");
    $stmt->execute();

    $stations = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($stations);
} catch (Exception $e) {
    echo json_encode(["error" => $e->getMessage()]);
}