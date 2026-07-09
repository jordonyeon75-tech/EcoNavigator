<!DOCTYPE html>
<html>
<head>
    <title>About Us - EcoNavigator</title>
    <link rel="stylesheet" href="../css/default_design.css">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        /* --- CUSTOM STYLES FOR ABOUT US PAGE --- */

        /* 1. Make the container wider for the "Split Screen" look */
        .page-container {
            max-width: 1200px !important;
            padding: 0 20px;
        }

        /* 2. Layout Grid (Split Screen) */
        .split-section {
            display: flex;
            align-items: center; /* Vertically center */
            justify-content: space-between;
            gap: 50px;
            margin-bottom: 80px;
            padding: 40px 0;
        }

        /* Responsive: Stack on mobile */
        @media (max-width: 900px) {
            .split-section {
                flex-direction: column;
                gap: 30px;
            }
            .split-section.reverse-mobile {
                flex-direction: column-reverse; /* Ensure text comes first on mobile */
            }
            .half-width {
                width: 100% !important;
            }
            /* Adjust slider height for mobile */
            .slider-container {
                height: 300px !important;
            }
        }

        .half-width {
            width: 50%;
            position: relative;
        }

        /* 3. Text Styling */
        .section-title {
            font-size: 2.5em;
            color: #2d8f5a;
            margin-bottom: 20px;
            font-weight: bold;
        }
        .section-text {
            font-size: 1.1em;
            line-height: 1.6;
            color: #555;
            margin-bottom: 20px;
            text-align: justify; /* Makes the text block look neat */
        }

        /* 4. Image Slider Styles */
        .slider-container {
            position: relative;
            width: 100%;
            height: 400px; /* Fixed height rectangle */
            overflow: hidden;
            border-radius: 12px;
            box-shadow: 0 8px 20px rgba(0,0,0,0.15); /* Nice shadow */
        }

        .slide {
            display: none;
            width: 100%;
            height: 100%;
            position: relative;
        }

        .slide.active {
            display: block;
            animation: fadeEffect 1s;
        }

        .slide img {
            width: 100%;
            height: 100%;
            object-fit: cover; /* Ensures PNGs fill the box nicely */
        }

        /* Fade Animation */
        @keyframes fadeEffect {
            from {opacity: .6}
            to {opacity: 1}
        }

        /* Slider Buttons (Prev/Next) */
        .prev, .next {
            cursor: pointer;
            position: absolute;
            top: 50%;
            width: auto;
            padding: 16px;
            margin-top: -22px;
            color: white;
            font-weight: bold;
            font-size: 18px;
            transition: 0.6s ease;
            border-radius: 0 3px 3px 0;
            user-select: none;
            background-color: rgba(0,0,0,0.3);
            z-index: 5;
        }
        .next {
            right: 0;
            border-radius: 3px 0 0 3px;
        }
        .prev:hover, .next:hover {
            background-color: rgba(0,0,0,0.8);
        }

        /* 5. "Join Us" Button Overlay (Centered on the image) */
        .slider-overlay-btn {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%); /* Perfectly centered */
            padding: 18px 40px;
            background-color: rgba(40, 167, 69, 0.9); /* Semi-transparent green */
            color: white;
            font-size: 20px;
            font-weight: bold;
            text-decoration: none;
            border-radius: 50px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            border: 2px solid white;
            z-index: 10;
            transition: all 0.3s ease;
        }

        .slider-overlay-btn:hover {
            background-color: #1e7e34;
            transform: translate(-50%, -55%); /* Slight lift effect */
            box-shadow: 0 6px 20px rgba(0,0,0,0.4);
        }

        /* 6. Founder Image (Right Side) */
        .static-image {
            width: 100%;
            height: 400px; /* Match height of slider for symmetry */
            object-fit: cover;
            border-radius: 12px;
            box-shadow: 0 8px 20px rgba(0,0,0,0.15);
            object-position: top center;
        }

    </style>
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
            <a href="about_us.php" class="active">About Us</a>
            <hr>
            <a href="contact_us.php">Contact Us</a>
        </div>
    </header>

    <div class="page-container">

        <div class="split-section">

            <div class="half-width">
                <div class="slider-container">

                    <div class="slide active">
                        <img src="../image/join_us_aboutus.png" alt="Join Our Team">
                        <a href="register.php" class="slider-overlay-btn">Join Us Now</a>
                    </div>

                    <div class="slide">
                        <img src="../image/about_us_eco.png" alt="Eco Initiative 1">
                    </div>

                    <div class="slide">
                        <img src="../image/about_us_eco1.png" alt="Eco Initiative 2">
                    </div>

                    <div class="slide">
                        <img src="../image/about_us_eco2.png" alt="Eco Initiative 3">
                    </div>

                    <div class="slide">
                        <img src="../image/about_us_eco3.png" alt="Eco Initiative 4">
                    </div>

                    <a class="prev" onclick="plusSlides(-1)">&#10094;</a>
                    <a class="next" onclick="plusSlides(1)">&#10095;</a>
                </div>
            </div>

            <div class="half-width">
                <h1 class="section-title">Who We Are</h1>
                <p class="section-text">
                    EcoNavigator is more than just a platform; we are a movement dedicated to preserving our planet for future generations.
                </p>
                <p class="section-text">
                    Established in 2023, our mission is to connect individuals with actionable data to reduce their carbon footprint. We believe that small, consistent actions lead to global change.
                </p>
                <p class="section-text">
                    Together, we can build a sustainable future. Explore our initiatives in the gallery, and if you're ready to make a difference, click the button to join our growing community!
                </p>
            </div>
        </div>

        <hr style="border: 0; border-top: 1px solid #eee;">

        <div class="split-section reverse-mobile">

            <div class="half-width">
                <h2 class="section-title">Our Visionary Leader</h2>
                <p class="section-text">
                    At the heart of EcoNavigator is our leader's vision: technology serving nature.
                </p>
                <p class="section-text">
                    "We don't inherit the earth from our ancestors, we borrow it from our children." This philosophy drives every decision we make. Our leadership team combines expertise in environmental science with cutting-edge data analytics to bring you the most accurate eco-insights.
                </p>
                <p class="section-text">
                    Whether you are an individual looking to recycle more effectively or a corporation aiming for net-zero emissions, Jordon and his team are here to guide you on your journey.
                </p>
            </div>

            <div class="half-width" style="text-align: center;">
                <img src="../image/founder_econa.png" alt="Jordon Yeon Choon Lye" class="static-image">

                <div style="margin-top: 15px;">
                    <h3 style="margin: 0; color: #2d8f5a; font-size: 1.4em;">Jordon Yeon Choon Lye (BSE)</h3>
                    <p style="margin: 5px 0 0; color: #555; font-weight: bold; font-size: 1.1em;">CEO & Founder of EcoNavigator</p>
                </div>
            </div>
        </div>

    </div>

    <?php include "footer_default.php"; ?>
</div>

<script>
    /* ===== Sidebar Logic ===== */
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    function toggleSidebar(e) {
        if(sidebar && overlay) {
            e.stopPropagation();
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
        }
    }

    if(overlay){
        overlay.addEventListener('click', function(){
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        });
    }

    if(sidebar) {
        sidebar.addEventListener('click', function(e){
            e.stopPropagation();
        });
    }

    /* ===== Slider Logic ===== */
    let slideIndex = 1;
    let slideTimer;

    // Initialize slider
    showSlides(slideIndex);
    startAutoSlide();

    // Next/Prev controls
    function plusSlides(n) {
        clearInterval(slideTimer); // Stop auto slide when user interacts
        showSlides(slideIndex += n);
        startAutoSlide(); // Restart auto slide
    }

    // Show specific slide
    function showSlides(n) {
        let i;
        let slides = document.getElementsByClassName("slide");

        if (n > slides.length) {slideIndex = 1}
        if (n < 1) {slideIndex = slides.length}

        for (i = 0; i < slides.length; i++) {
            slides[i].style.display = "none";
            slides[i].classList.remove('active');
        }

        slides[slideIndex-1].style.display = "block";
        slides[slideIndex-1].classList.add('active');
    }

    // Auto Slide (4.5 seconds)
    function startAutoSlide() {
        slideTimer = setInterval(function() {
            slideIndex++;
            showSlides(slideIndex);
        }, 4500);
    }
</script>

</body>
</html>