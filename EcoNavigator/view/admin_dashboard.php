<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>EcoNavigator - Admin Dashboard</title>
    <style>
        body { font-family: Arial, sans-serif; background-color: #f4f7f6; padding: 20px; }
        h1 { color: #2e7d32; }
        .admin-section { margin-top: 20px; padding: 10px; border: 1px solid #ccc; border-radius: 4px; }
        .admin-section h2 { color: #1976d2; }
        a { color: #2e7d32; text-decoration: none; margin-right: 10px; }
        a:hover { text-decoration: underline; }
    </style>
</head>
<body>
<?php
session_start();
if (!isset($_SESSION['user_id']) || $_SESSION['usertype'] != 1) {
    header("Location: dashboard.php");
    exit();
}
?>

<h1>Welcome to the Admin Dashboard, <?php echo htmlspecialchars($_SESSION['username']); ?>!</h1>
<p>This is the admin dashboard for managing the EcoNavigator platform.</p>

<div class="admin-section">
    <h2>Admin Controls</h2>
    <p>Manage user accounts, charging station locations, and more.</p>
    <a href="manage_users.php">Manage Users</a> | <a href="manage_locations.php">Manage Locations</a>
</div>

<a href="dashboard.php">Back to Public Dashboard</a>
<a href="logout.php">Logout</a>
</body>
</html>