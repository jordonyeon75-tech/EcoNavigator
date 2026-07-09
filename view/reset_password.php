<?php
//
session_start();
$email = isset($_SESSION['reset_email']) ? $_SESSION['reset_email'] : '';
$is_verified = isset($_SESSION['otp_verified']) && $_SESSION['otp_verified'] === true;
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Password</title>
    <link rel="stylesheet" href="../css/reset_password_design.css">
</head>
<body>

<div class="login-container">
    <h2>Reset Password</h2>

    <?php if (!$is_verified): ?>
        <div class="alert-box">
            OTP code sent to your email.
        </div>

        <p class="instruction-text">
            We sent a 6-digit code to <strong><?= htmlspecialchars($email) ?></strong>.<br>
            It expires in 15 minutes.
        </p>

        <form method="post" action="../controller/UserController.php?action=verify_otp">
            <input type="hidden" name="email" value="<?= htmlspecialchars($email) ?>">

            <div class="input-group">
                <input type="text" name="otp" placeholder="Enter 6-digit OTP" required autocomplete="off">
            </div>

            <button type="submit">Verify Code</button>
        </form>

        <a href="../view/forgot_pass_p.php" class="bottom-link">Wrong email? Start Over</a>

    <?php else: ?>
        <div class="alert-box">
            OTP Verified! Please set your new password.
        </div>

        <form method="post" action="../controller/UserController.php?action=reset_password">
            <input type="hidden" name="email" value="<?= htmlspecialchars($email) ?>">

            <div class="input-group">
                <input type="password" name="new_password" placeholder="New Password" required>
            </div>
            <div class="input-group">
                <input type="password" name="confirm_password" placeholder="Confirm Password" required>
            </div>

            <button type="submit">Update Password</button>
        </form>

    <?php endif; ?>

    <?php if (isset($_SESSION['error'])): ?>
        <div class="message error">
            <?= $_SESSION['error']; unset($_SESSION['error']); ?>
        </div>
    <?php endif; ?>

</div>

</body>
</html>