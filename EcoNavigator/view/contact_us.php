<?php
// Initialize variables
$msg = "";
$msgClass = "";

// Check if form is submitted
if ($_SERVER["REQUEST_METHOD"] == "POST") {

    // 1. Get Form Data
    $name = htmlspecialchars(trim($_POST['userName']));
    $email = htmlspecialchars(trim($_POST['userEmail']));
    $date = htmlspecialchars(trim($_POST['msgDate']));
    $messageContent = htmlspecialchars(trim($_POST['userMessage']));

    // Your Email
    $toEmail = "sc05240034bse@sentral.edu.my";
    $subject = "New Support Message from $name";

    // 2. Handle File Upload
    $attachmentInfo = "No image attached.";

    if (isset($_FILES['userImage']) && $_FILES['userImage']['error'] === UPLOAD_ERR_OK) {
        $uploadDir = 'uploads/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0777, true);
        }

        $fileName = basename($_FILES['userImage']['name']);
        $targetFilePath = $uploadDir . time() . "_" . $fileName;
        $fileType = pathinfo($targetFilePath, PATHINFO_EXTENSION);

        $allowTypes = array('jpg','png','jpeg','gif');
        if (in_array(strtolower($fileType), $allowTypes)) {
            if (move_uploaded_file($_FILES['userImage']['tmp_name'], $targetFilePath)) {
                // For localhost testing, this link might need 'localhost/your_project_folder/view/...'
                $attachmentInfo = "User uploaded an image: " . $_SERVER['HTTP_HOST'] . "/view/" . $targetFilePath;
            }
        }
    }

    // 3. Prepare Email Body
    $emailBody = "Name: $name\n" .
        "Email: $email\n" .
        "Date Selected: $date\n" .
        "Attachment: $attachmentInfo\n\n" .
        "Message:\n$messageContent";

    // 4. Send Email (REAL MODE)
    $headers = "From: " . $email . "\r\n";
    // Ideally, for Gmail SMTP, the 'From' header might be overridden by Gmail to be your own address
    // to prevent spam, but the Reply-To will work.
    $headers .= "Reply-To: " . $email . "\r\n";

    // Try to send
    if(mail($toEmail, $subject, $emailBody, $headers)){
        $msg = "<strong>Success!</strong> Your message has been sent to our support team.";
        $msgClass = "alert-success";
    } else {
        $msg = "<strong>Error:</strong> The email could not be sent. Check your Internet or XAMPP config.";
        $msgClass = "alert-danger";
    }
}
?>

<!DOCTYPE html>
<html>
<head>
    <title>Contact Us - EcoNavigator</title>
    <link rel="stylesheet" href="../css/default_design.css">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
<div class="page-wrapper">
    <div id="sidebar-overlay"></div>

    <header class="page-header">
        <a href="dashboard.php" class="home-btn">Home</a>

        <div class="hamburger" onclick="toggleSidebar(event)">
            <div></div>
            <div></div>
            <div></div>
        </div>

        <nav class="page-nav">
            <a href="privacy_page.php">Privacy Policy</a>
            <a href="terms_page.php">Terms of Service</a>
            <a href="about_us.php">About Us</a>
            <a href="contact_us.php">Contact Us</a>
        </nav>

        <div class="sidebar" id="sidebar">
            <div class="sidebar-header">EcoNavigator Menu</div>
            <a href="privacy_page.php">Privacy Policy</a>
            <hr>
            <a href="terms_page.php">Terms of Service</a>
            <hr>
            <a href="about_us.php">About Us</a>
            <hr>
            <a href="contact_us.php" class="active">Contact Us</a>
        </div>
    </header>

    <div class="page-container">
        <div class="page-title">Get in Touch</div>

        <div class="page-content">
            <p>Have any questions about our service or feedback? We'd love to hear from you.</p>

            <?php if($msg != ""): ?>
                <div class="alert-box <?php echo $msgClass; ?>" style="display:block;">
                    <?php echo $msg; ?>
                </div>
            <?php else: ?>
                <div id="form-alert" class="alert-box"></div>
            <?php endif; ?>

            <form id="contactForm" class="contact-form-wrapper" action="contact_us.php" method="POST" enctype="multipart/form-data" novalidate onsubmit="handleFormSubmit(event)">

                <div class="form-group">
                    <label class="form-label">Support Team Email</label>
                    <input type="text" class="form-control readonly-email" value="sc05240034bse@sentral.edu.my" readonly>
                    <small style="color: #777;">(This is our official support channel)</small>
                </div>

                <div class="form-group">
                    <label for="userName" class="form-label">Your Name <span style="color:red">*</span></label>
                    <input type="text" id="userName" name="userName" class="form-control" placeholder="Enter your full name" required>
                    <div class="error-text" id="error-name">Please enter your name.</div>
                </div>

                <div class="form-group">
                    <label for="userEmail" class="form-label">Your Email <span style="color:red">*</span></label>
                    <input type="email" id="userEmail" name="userEmail" class="form-control" placeholder="example@email.com" required>
                    <div class="error-text" id="error-email">Please enter a valid email address.</div>
                </div>

                <div class="form-group">
                    <label for="msgDate" class="form-label">Date <span style="color:red">*</span></label>
                    <input type="date" id="msgDate" name="msgDate" class="form-control" required>
                    <small style="color: #777;">(You can select dates from earlier this year up to today)</small>
                    <div class="error-text" id="error-date">Please select a valid date.</div>
                </div>

                <div class="form-group">
                    <label for="userMessage" class="form-label">Message <span style="color:red">*</span></label>
                    <textarea id="userMessage" name="userMessage" class="form-control" rows="6" placeholder="Type your message here..." maxlength="4000" required></textarea>

                    <div class="char-count">
                        <span id="charCount">0</span> / 4000 characters
                        <span id="limitAlert" style="display:none; color: red; margin-left: 10px;">(Limit reached!)</span>
                    </div>
                    <div class="error-text" id="error-message">Please enter a message.</div>
                </div>

                <div class="form-group">
                    <label for="userImage" class="form-label">Attachment (Optional)</label>
                    <input type="file" id="userImage" name="userImage" class="form-control" accept="image/png, image/jpeg, image/jpg, image/gif">
                    <small style="color: #777;">Only image files (JPG, PNG, GIF) are allowed. Max 1 file.</small>
                    <div class="error-text" id="error-file">Invalid file type. Only images are allowed (No video/music).</div>
                </div>

                <button type="submit" class="btn-submit">Send Message</button>
            </form>
        </div>
    </div>

    <?php include "footer_default.php"; ?>
</div>
<script src="../js/contact_func.js"></script>
</body>
</html>