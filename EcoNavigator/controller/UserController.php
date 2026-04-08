<?php
//
session_start();
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
require_once '../config/database.php';
require_once '../model/UserModel.php';

class UserController
{
    private $db;
    private $userModel;

    public function __construct()
    {
        $database = new Database();
        $this->db = $database->getConnection();
        if ($this->db === null) {
            die("Database connection failed.");
        }
        $this->userModel = new UserModel($this->db);
    }

    // --- Google Login Logic (UNCHANGED) ---
    public function google_login()
    {
        if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['google_credential'])) {
            $token = $_POST['google_credential'];
            $payload = $this->decode_jwt($token);

            if (!$payload || !isset($payload['email'])) {
                $_SESSION['error'] = "Google Login Failed: Invalid Token";
                header("Location: ../view/login.php");
                exit();
            }

            $email = $payload['email'];
            $name = $payload['name'];
            $user = $this->userModel->getUserByEmail($email);

            if ($user) {
                if ($user['status'] === 'pending') {
                    $this->userModel->activateUser($user['id']);
                }
                $this->performLoginSession($user);
            } else {
                $username = $name;
                if ($this->userModel->getUserByUsername($username)) {
                    $username = $name . rand(1000, 9999);
                }
                $random_password = bin2hex(random_bytes(10)) . "A1!";
                $password_hash = password_hash($random_password, PASSWORD_DEFAULT);
                $activation_token = bin2hex(random_bytes(16));

                if ($this->userModel->createUser($username, $email, $password_hash, $activation_token)) {
                    $newUser = $this->userModel->getUserByEmail($email);
                    if ($newUser) {
                        $this->userModel->activateUser($newUser['id']);
                        $this->performLoginSession($newUser);
                    } else {
                        $_SESSION['error'] = "Account created but failed to retrieve data.";
                        header("Location: ../view/login.php");
                        exit();
                    }
                } else {
                    $_SESSION['error'] = "Google Registration Failed: Database error.";
                    header("Location: ../view/login.php");
                    exit();
                }
            }
        }
    }

    public function facebook_login()
    {
        if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['fb_email'])) {
            $email = $_POST['fb_email'];
            $name = $_POST['fb_name'];

            $user = $this->userModel->getUserByEmail($email);

            if ($user) {
                // User exists, log them in
                if ($user['status'] === 'pending') {
                    $this->userModel->activateUser($user['id']);
                }
                $this->performLoginSession($user);
            } else {
                // New User: Create account
                $username = str_replace(' ', '', strtolower($name)); // remove spaces
                if ($this->userModel->getUserByUsername($username)) {
                    $username = $username . rand(100, 999);
                }

                $random_password = bin2hex(random_bytes(10)) . "A1!";
                $password_hash = password_hash($random_password, PASSWORD_DEFAULT);
                $activation_token = bin2hex(random_bytes(16));

                if ($this->userModel->createUser($username, $email, $password_hash, $activation_token)) {
                    $newUser = $this->userModel->getUserByEmail($email);
                    $this->userModel->activateUser($newUser['id']);
                    $this->performLoginSession($newUser);
                }
            }
        }
    }

    // --- Register (UNCHANGED) ---
    public function register()
    {
        if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['register'])) {
            $username = trim($_POST['username']);
            $email = trim($_POST['email']);
            $password = trim($_POST['password']);
            $confirm_password = trim($_POST['confirm_password']);

            if (empty($username) || empty($email) || empty($password) || empty($confirm_password)) {
                $error = "All fields are required!";
                require_once '../view/register.php';
                return;
            }
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $error = "Invalid email format!";
                require_once '../view/register.php';
                return;
            }
            if ($password !== $confirm_password) {
                $error = "Passwords do not match!";
                require_once '../view/register.php';
                return;
            }
            if (!preg_match("/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d\W]{8,20}$/", $password)) {
                $error = "Password must be 8-20 characters long, contain at least one uppercase letter, one lowercase letter, and one number.";
                require_once '../view/register.php';
                return;
            }
            if ($this->userModel->getUserByEmail($email)) {
                $error = "Email is already registered! Please login.";
                require_once '../view/register.php';
                return;
            }
            if ($this->userModel->getUserByUsername($username)) {
                $error = "Username has been taken!";
                require_once '../view/register.php';
                return;
            }

            $activation_token = bin2hex(random_bytes(16));
            $password_hash = password_hash($password, PASSWORD_DEFAULT);

            if ($this->userModel->createUser($username, $email, $password_hash, $activation_token)) {
                $host = $_SERVER['HTTP_HOST'];
                $base_url = "http://" . $host . "/EcoNavigator";
                $activation_link = $base_url . "/controller/UserController.php?action=activate&token=" . $activation_token;
                $to = $email;
                $subject = "Welcome to EcoNavigator!";
                $message = "Hello $username,\n\n" .
                    "Thank you for registering with EcoNavigator!\n\n" .
                    "Your account is active. Click here to see your welcome message:\n\n" .
                    "$activation_link\n\n" .
                    "EcoNavigator Team";
                $headers = "From: no-reply@econavigator.com\r\n";

                if (mail($to, $subject, $message, $headers)) {
                    $success = "Registration successful! Please check your email ($email) to activate account.";
                    require_once '../view/register.php';
                } else {
                    $success = "Registration successful! <br>(Email failed, <a href='$activation_link'>Click Here to Activate</a>)";
                }
                require_once '../view/register.php';

            } else {
                $error = "Registration failed due to a database error.";
                require_once '../view/register.php';
            }
        } else {
            require_once '../view/register.php';
        }
    }

    // --- Activate (UNCHANGED) ---
    public function activate()
    {
        if (isset($_GET['token'])) {
            $token = $_GET['token'];
            $user = $this->userModel->getUserByToken($token);

            if ($user) {
                if (strtotime(date('Y-m-d H:i:s')) > strtotime($user['activation_expires'])) {
                    $this->userModel->deleteUser($user['id']);
                    $_SESSION['error'] = "Activation link expired! Please register again.";
                    header("Location: ../view/register.php");
                } else {
                    $this->userModel->activateUser($user['id']);
                    header("Location: ../view/activation_welc_message.php");
                }
            } else {
                $_SESSION['error'] = "Invalid or already used activation link.";
                header("Location: ../view/login.php");
            }
            exit();
        } else {
            header("Location: ../view/login.php");
            exit();
        }
    }

    // --- Login (UNCHANGED) ---
    public function login()
    {
        if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['login'])) {
            $email = trim($_POST['email']);
            $password = trim($_POST['password']);
            $remember = isset($_POST['remember']);

            if (empty($email) || empty($password)) {
                $_SESSION['error'] = "Please fill in both email and password.";
                $_SESSION['old_email'] = $email;
                header("Location: ../view/login.php");
                exit();
            }

            $user = $this->userModel->getUserByEmail($email);

            if (!$user) {
                $_SESSION['error'] = "We couldn't find an account with that email.";
                $_SESSION['old_email'] = $email;
                header("Location: ../view/login.php"); exit();
            }

            if ($user['status'] === 'pending') {
                $_SESSION['error'] = "Please activate your account via the email we sent you before logging in.";
                $_SESSION['old_email'] = $email;
                header("Location: ../view/login.php");
                exit();
            }

            if (password_verify($password, $user['password_hash'])) {
                if ($remember) {
                    setcookie('remember_me', $user['id'], time() + (30 * 24 * 60 * 60), '/'); // 30 days
                }
                $this->performLoginSession($user);
            } else {
                $_SESSION['error'] = "Incorrect password. Please try again.";
                $_SESSION['old_email'] = $email;
                header("Location: ../view/login.php");
                exit();
            }

        } else {
            header("Location: ../view/login.php");
            exit();
        }
    }

    // --- FORGOT PASSWORD (START) ---
    public function forgot() {
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $email = trim($_POST['email']);

            $user = $this->userModel->getUserByEmail($email);
            if ($user) {
                $otp = rand(100000, 999999);
                $this->userModel->saveResetOtp($email, $otp);

                $subject = "Password Reset OTP - EcoNavigator";
                $message = "Your OTP is: $otp";
                $headers = "From: no-reply@econavigator.com";

                if (@mail($email, $subject, $message, $headers)) {
                    $_SESSION['success'] = "OTP sent to your email!";
                } else {
                    $_SESSION['success'] = "OTP Generated: $otp (Email failed to send on localhost)";
                }

                $_SESSION['reset_email'] = $email;
                unset($_SESSION['otp_verified']); // Reset verification status
                header("Location: ../view/reset_password.php"); // Ensure file name matches your view
                exit();
            } else {
                $_SESSION['error'] = "Email not found.";
            }
        }
        require_once '../view/forgot_pass_p.php';
    }

    // --- STEP 1: VERIFY OTP ---
    public function verify_otp() {
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $email = $_POST['email'];
            $otp = trim($_POST['otp']);

            // Verify using the model
            if ($this->userModel->verifyOtp($email, $otp)) {
                // SUCCESS: Mark session as verified
                $_SESSION['otp_verified'] = true;
                $_SESSION['success'] = "OTP Verified! Please set your new password.";
                header("Location: ../view/reset_password.php");
                exit();
            } else {
                // FAIL
                $_SESSION['error'] = "Invalid or expired OTP.";
                header("Location: ../view/reset_password.php");
                exit();
            }
        }
    }

    // --- STEP 2: RESET PASSWORD (After OTP is verified) ---
    public function reset_password() {
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {

            // Security Check: Make sure they passed Step 1
            if (!isset($_SESSION['otp_verified']) || $_SESSION['otp_verified'] !== true) {
                $_SESSION['error'] = "Session expired. Please verify OTP again.";
                header("Location: ../view/reset_password.php");
                exit();
            }

            $email = $_POST['email'];
            $new_pass = $_POST['new_password'];
            $confirm_pass = $_POST['confirm_password'];

            if ($new_pass !== $confirm_pass) {
                $_SESSION['error'] = "Passwords do not match.";
                header("Location: ../view/reset_password.php");
                exit();
            }

            $new_hash = password_hash($new_pass, PASSWORD_DEFAULT);
            $this->userModel->updatePasswordByEmail($email, $new_hash);

            $_SESSION['info'] = "Password reset successful! Please login.";

            // Cleanup session
            unset($_SESSION['reset_email']);
            unset($_SESSION['otp_verified']);

            header("Location: ../view/login.php");
            exit();
        }
    }

    // --- Helpers (UNCHANGED) ---
    private function performLoginSession($user) {
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['username'] = $user['username'];
        $_SESSION['usertype'] = $user['usertype'];
        $_SESSION['email'] = $user['email'];
        $this->userModel->updateLastLogin($user['id']);
        header("Location: ../view/dashboard.php");
        exit();
    }

    private function decode_jwt($token) {
        $parts = explode(".", $token);
        if (count($parts) < 2) return null;
        $payload = json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], $parts[1])), true);
        return $payload;
    }

    public function changePassword()
    {
        if ($_SERVER['REQUEST_METHOD'] == 'POST') {
            $userId = $_SESSION['user_id'];
            $currentPassword = $_POST['current_password'];
            $newPassword = $_POST['new_password'];
            $confirmPassword = $_POST['confirm_password'];

            $user = $this->userModel->getUserById($userId);
            if (!$user || !password_verify($currentPassword, $user['password_hash'])) {
                echo json_encode(['success' => false, 'message' => 'Current password is incorrect']);
                return;
            }
            if ($newPassword !== $confirmPassword) {
                echo json_encode(['success' => false, 'message' => 'Passwords do not match']);
                return;
            }
            if (strlen($newPassword) < 8) {
                echo json_encode(['success' => false, 'message' => 'Password must be at least 8 characters']);
                return;
            }
            $newHash = password_hash($newPassword, PASSWORD_DEFAULT);
            $success = $this->userModel->updatePassword($userId, $newHash);

            echo json_encode(['success' => $success, 'message' => $success ? 'Password updated successfully' : 'Failed to update password']);
        }
    }
}

// --- UPDATED ROUTER LOGIC ---
$controller = new UserController();
if (isset($_GET['action'])) {
    switch ($_GET['action']) {
        case 'login':
            $controller->login();
            break;
        case 'google_login':
            $controller->google_login();
            break;
        case 'facebook_login':
            $controller->facebook_login();
            break;
        case 'register':
            $controller->register();
            break;
        case 'forgot':
            $controller->forgot();
            break;
        case 'activate':
            $controller->activate();
            break;
        case 'changePassword':
            $controller->changePassword();
            break;

        // NEW ACTIONS FOR SPLIT FLOW
        case 'verify_otp':
            $controller->verify_otp();
            break;
        case 'reset_password': // Renamed from 'reset' to be clearer
            $controller->reset_password();
            break;

        default:
            $controller->login();
    }
} else {
    $controller->login();
}
?>