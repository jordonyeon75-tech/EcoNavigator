<?php
require_once __DIR__ . '/../config/Database.php';
require_once __DIR__ . '/../model/UserInfo.php';

header("Content-Type: application/json");

try {
    // Create DB connection (SQLite)
    $database = new Database();
    $db = $database->getConnection();

    if ($db === null) {
        throw new Exception("Database connection failed.");
    }

    // Pass PDO to model
    $userInfo = new UserInfo($db);
    $totalUsers = $userInfo->getTotalUsers();

    echo json_encode(["total_users" => $totalUsers]);
} catch (Exception $e) {
    echo json_encode(["error" => $e->getMessage()]);
}