<?php
session_start();
session_unset();
session_destroy();

// prevent browser back showing old navbar/session data
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Pragma: no-cache");
header("Expires: 0");
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Logged Out - EcoNavigator</title>
    <link rel="stylesheet" href="/css/header_design.css">
    <!-- Google Font: Nunito Sans -->
    <link href="https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@600&display=swap" rel="stylesheet">
</head>
<body>
<!-- EcoNavigator header (always links to dashboard) -->
<header>
    <a href="dashboard.php">EcoNavigator</a>
</header>

<div class="logout-box">
    <h2>You have been logged out.</h2>
    <p>Thank you for using <strong>EcoNavigator</strong>.</p>
    <a href="login.php" class="button">Back to Login</a>
    <a href="dashboard.php" class="button">Back to Home Page</a>
</div>
</body>
</html>
