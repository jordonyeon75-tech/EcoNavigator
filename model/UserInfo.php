<?php
class UserInfo {
    private $pdo;

    public function __construct($db) {
        $this->pdo = $db;
    }

    public function getTotalUsers() {
        try {
            $stmt = $this->pdo->query("SELECT COUNT(*) as total FROM users");
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            return $row['total'] ?? 0;
        } catch (PDOException $e) {
            error_log("Database error in getTotalUsers: " . $e->getMessage());
            return 0;
        }
    }
}