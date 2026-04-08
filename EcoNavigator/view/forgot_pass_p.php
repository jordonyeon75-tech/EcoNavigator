<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
?>
<!DOCTYPE html>
<html>
<head>
    <title>Forgot Password</title>
    <link rel="stylesheet" href="../css/login_design.css">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
<div class="login-container">
    <h2>Forgot Password</h2>
    <p>Enter your email to receive an OTP.</p>

    <form method="post" action="../controller/UserController.php?action=forgot">
        <div class="input-group">
            <input type="email" name="email" placeholder="Enter your email" required>
        </div>
        <button type="submit">Send OTP</button>

        <div class="links">
            <a href="../view/login.php">Back to Login</a>
        </div>

        <?php if (isset($_SESSION['error'])): ?>
            <div class="message error">
                <?= $_SESSION['error']; unset($_SESSION['error']); ?>
            </div>
        <?php endif; ?>
    </form>
</div>
</body>
</html>