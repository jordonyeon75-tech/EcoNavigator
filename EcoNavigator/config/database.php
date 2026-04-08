<?php
class Database {
    private $db_file = __DIR__ . '/../EcoNavigator.sqlite'; // Root-level DB
    public $conn;

    public function getConnection() {
        $this->conn = null;
        try {
            $this->conn = new PDO("sqlite:" . $this->db_file);
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            // echo "Connected successfully!<br>"; // Uncomment for debug
        } catch(PDOException $exception) {
            echo "Error: " . $exception->getMessage() . "<br>";
            return null;
        }
        return $this->conn;
    }
}
?>