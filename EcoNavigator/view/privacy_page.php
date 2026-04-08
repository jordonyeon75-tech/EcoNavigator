<!DOCTYPE html>
<html>
<head>
    <title>Privacy Policy - EcoNavigator</title>
    <link rel="stylesheet" href="../css/default_design.css">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
<div class="page-wrapper">
    <!-- Overlay for sidebar -->
    <div id="sidebar-overlay"></div>
    <header class="page-header">
    <a href="dashboard.php" class="home-btn">Home</a>

    <!-- Hamburger for mobile -->
    <div class="hamburger" onclick="toggleSidebar(event)">
        <div></div>
        <div></div>
        <div></div>
    </div>

    <!-- Normal navigation for desktop -->
    <nav class="page-nav">
        <a href="privacy_page.php">Privacy Policy</a>
        <a href="terms_page.php">Terms of Service</a>
        <a href="about_us.php">About Us</a>
        <a href="contact_us.php">Contact Us</a>
    </nav>

    <!-- Sidebar for mobile -->
    <div class="sidebar" id="sidebar">
        <div class="sidebar-header">EcoNavigator Privacy & Terms</div>
        <a href="privacy_page.php" class="active">Privacy Policy</a>
        <hr>
        <a href="terms_page.php">Terms of Service</a>
        <hr>
        <a href="about_us.php">About Us</a>
        <hr>
        <a href="contact_us.php">Contact Us</a>
    </div>
</header>

<div class="page-container">
    <div class="page-title">Privacy Policy</div>

    <div class="page-content">
        <p>
            This Privacy Policy explains how EcoNavigator collects, uses, and protects your personal information.
        </p>

        <p>
            We may collect data such as location information, usage data, and account details to improve our services.
        </p>

        <p>
            Your information will never be sold to third parties and is protected using industry-standard security practices.
        </p>

        <p>
            (Later you can replace this text with Google Privacy wording.)
        </p>
    </div>
</div>

<?php include "footer_default.php"; ?>

</div>

<script>
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    function toggleSidebar(event) {
        event.stopPropagation();
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
    }

    // Close sidebar when clicking overlay
    overlay.addEventListener('click', function(){
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    });

    sidebar.addEventListener('click', function(event){
        event.stopPropagation();
    });

    document.addEventListener('click', function(){
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    });
</script>
</body>
</html>