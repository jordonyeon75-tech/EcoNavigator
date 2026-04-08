<?php
// 1. Start Session securely
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// 2. Initialize variables
$error = "";
$info = "";
$email_value = "";

// 3. Check for Errors from Controller
if (isset($_SESSION['error'])) {
    $error = $_SESSION['error'];
    unset($_SESSION['error']); // Clear it so it doesn't stay forever
}

// 4. Check for Info/Success messages
if (isset($_SESSION['info'])) {
    $info = $_SESSION['info'];
    unset($_SESSION['info']);
}

// 5. Restore the typed email (so user doesn't have to re-type it)
if (isset($_SESSION['old_email'])) {
    $email_value = $_SESSION['old_email'];
    unset($_SESSION['old_email']);
}

// 6. Handle URL messages (Logout/Login Required)
if (isset($_GET['message'])) {
    if ($_GET['message'] === 'loggedout') {
        $info = "You have been logged out successfully.";
    } elseif ($_GET['message'] === 'login_required') {
        $info = "You must login to continue.";
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>EcoNavigator - Login</title>
    <link rel="stylesheet" type="text/css" href="/css/login_design.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"></head>
<body>
<div class="login-container">
    <h2>EcoNavigator</h2>
    <form method="post" action="../controller/UserController.php?action=login">
        <div class="input-group">
            <input type="email" name="email" placeholder="Email" value="<?php echo htmlspecialchars($email_value); ?>" required></div>
        <div class="input-group password-group">
            <input type="password" name="password" id="passwordField" placeholder="Password" required>
            <img src="../image/oth_design/eye_hidden.png" alt="Show Password" id="togglePassword" class="password-toggle-icon">
        </div>

        <div class="remember">
            <input type="checkbox" name="remember" id="remember">
            <label for="remember">Remember Me</label>
        </div>

        <button type="submit" name="login">Login</button>

        <div class="separator">OR</div>

        <div class="sign-in-text">Sign in with</div>

        <div class="social-login">

            <div class="icon-btn-wrapper" title="Sign in with Google">
                <div id="buttonDiv" class="google-iframe-overlay"></div>
                <div class="custom-icon-btn google-btn">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google">
                </div>
            </div>

            <div class="icon-btn-wrapper" title="Login with Facebook">
                <button type="button" onclick="fbLogin()" class="custom-icon-btn facebook-btn">
                    <i class="fab fa-facebook-f"></i>
                </button>
            </div>

        </div>

        <div class="links">
            <a href="../controller/UserController.php?action=forgot">Forgot Password?</a>
            <a href="register.php">Register Here!</a>
        </div>

        <?php if (!empty($error)): ?>
            <div class="message error"><?php echo $error; ?></div>
        <?php endif; ?>

        <?php if (!empty($info)): ?>
            <div class="message info"><?php echo $info; ?></div>
        <?php endif; ?>
    </form>
</div>
<script src="https://accounts.google.com/gsi/client" async defer></script>
<script src="/js/OAuth_Google.js"></script>
<script async defer crossorigin="anonymous" src="https://connect.facebook.net/en_US/sdk.js"></script>
<script src="/js/OAuth_Facebook.js"></script>
<script>
    const togglePassword = document.getElementById('togglePassword');
    const passwordField = document.getElementById('passwordField');

    togglePassword.addEventListener('click', function () {
        // Toggle the input type between "password" and "text"
        const type = passwordField.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordField.setAttribute('type', type);

        // Toggle the eye icon image
        if (type === 'password') {
            this.src = '../image/oth_design/eye_hidden.png';
            this.alt = 'Show Password';
        } else {
            this.src = '../image/oth_design/eye_unhide.png';
            this.alt = 'Hide Password';
        }
    });
</script>
</body>
</html>