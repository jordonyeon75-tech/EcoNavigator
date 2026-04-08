<?php
session_start();
if (!isset($_SESSION['user_id'])) {
    header("Location: login.php");
    exit();
}

require_once '../config/database.php';
require_once '../model/UserModel.php';

$database = new Database();
$db = $database->getConnection();
$userModel = new UserModel($db);

$userId = $_SESSION['user_id'];
$username = htmlspecialchars($_SESSION['username']);
$email = htmlspecialchars($_SESSION['email'] ?? '');
$usertype = $_SESSION['usertype'] == 1 ? 'Admin' : 'User';
$user = $userModel->getUserByEmail($email);
$last_login = $user['last_login'] ?? 'Never';
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>EcoNavigator - Profile</title>
    <link rel="stylesheet" href="../css/styles.css">
    <link rel="stylesheet" href="../css/profile_design.css">
</head>
<body>
<?php if (isset($_SESSION['user_id'])): ?>
    <a href="dashboard.php" class="home-btn">EcoNavigator</a>
<?php else: ?>
    <span class="home-btn">EcoNavigator</span>
<?php endif; ?>
<div class="profile-container">
    <h1>My Profile</h1>
    <div class="info">
        <p><strong>Username:</strong> <?= $username; ?></p>
        <p><strong>Email:</strong> <?= $email; ?></p>
        <p><strong>User Type:</strong> <?= $usertype; ?></p>
        <p><strong>Last Login:</strong> <?= $last_login; ?></p>
    </div>

    <h3>Change Password</h3>
    <form id="passwordForm">
        <input type="password" name="current_password" placeholder="Current Password" required>
        <input type="password" name="new_password" placeholder="New Password" required>
        <input type="password" name="confirm_password" placeholder="Confirm New Password" required>
        <button type="submit">Update Password</button>
    </form>
    <div class="message" id="message"></div>

    <div class="logout">
        <a href="logout.php">Logout</a>
    </div>
</div>

<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
<script>
    $("#passwordForm").submit(function(e) {
        e.preventDefault();
        $.ajax({
            url: "../controller/UserController.php?action=changePassword",
            type: "POST",
            data: $(this).serialize(),
            dataType: "json",
            success: function(response) {
                $("#message").text(response.message).css("color", response.success ? "green" : "red");
                if (response.success) $("#passwordForm")[0].reset();
            }
        });
    });
</script>
</body>
</html>