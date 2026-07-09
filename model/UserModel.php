<?php
class UserModel {
    private $pdo;

    public function __construct($db) {
        $this->pdo = $db;
    }

    // --- YOUR EXISTING FUNCTIONS (UNCHANGED) ---

    public function createUser($username, $email, $password_hash, $token) {
        $expires = date('Y-m-d H:i:s', strtotime('+1 day'));
        $sql = "INSERT INTO users (username, email, password_hash, status, usertype, activation_token, activation_expires) 
                VALUES (?, ?, ?, 'pending', 2, ?, ?)";
        $stmt = $this->pdo->prepare($sql);
        return $stmt->execute([$username, $email, $password_hash, $token, $expires]);
    }

    public function getUserByEmail($email) {
        $stmt = $this->pdo->prepare("SELECT id, username, email, password_hash, usertype, status FROM users WHERE email = ?");
        $stmt->execute([$email]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function getUserByUsername($username) {
        $stmt = $this->pdo->prepare("SELECT id FROM users WHERE username = ?");
        $stmt->execute([$username]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function getUserByToken($token) {
        $stmt = $this->pdo->prepare("SELECT id, activation_expires FROM users WHERE activation_token = ? AND status = 'pending'");
        $stmt->execute([$token]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function activateUser($user_id) {
        $stmt = $this->pdo->prepare("UPDATE users SET status = 'active', activation_token = NULL, activation_expires = NULL WHERE id = ?");
        return $stmt->execute([$user_id]);
    }

    public function deleteUser($user_id) {
        $stmt = $this->pdo->prepare("DELETE FROM users WHERE id = ?");
        return $stmt->execute([$user_id]);
    }

    public function updateLastLogin($user_id) {
        $timestamp = date('Y-m-d H:i:s');
        $stmt = $this->pdo->prepare("UPDATE users SET last_login = ? WHERE id = ?");
        return $stmt->execute([$timestamp, $user_id]);
    }

    public function getUserById($id) {
        $stmt = $this->pdo->prepare("SELECT id, username, email, password_hash FROM users WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function updatePassword($id, $newHash) {
        $stmt = $this->pdo->prepare("UPDATE users SET password_hash = ? WHERE id = ?");
        return $stmt->execute([$newHash, $id]);
    }

    // --- FIXED: FORGOT PASSWORD / OTP LOGIC ---

    // 1. SAVE OTP (Fixed: uses $this->pdo and correct columns)
    public function saveResetOtp($email, $otp) {
        $expires = date("Y-m-d H:i:s", strtotime("+15 minutes"));

        $sql = "UPDATE users SET reset_token = ?, reset_expires = ? WHERE email = ?";
        $stmt = $this->pdo->prepare($sql);
        return $stmt->execute([$otp, $expires, $email]);
    }

    // 2. VERIFY OTP (Fixed: uses $this->pdo and correct columns)
    public function verifyOtp($email, $otp) {
        $now = date('Y-m-d H:i:s');

        $sql = "SELECT id FROM users WHERE email = ? AND reset_token = ? AND reset_expires > ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$email, $otp, $now]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    // 3. UPDATE PASSWORD BY EMAIL (Fixed: uses $this->pdo)
    public function updatePasswordByEmail($email, $new_hash) {
        $sql = "UPDATE users SET password_hash = ?, reset_token = NULL, reset_expires = NULL WHERE email = ?";
        $stmt = $this->pdo->prepare($sql);
        return $stmt->execute([$new_hash, $email]);
    }
}
?>