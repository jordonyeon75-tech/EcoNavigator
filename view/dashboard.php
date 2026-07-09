<?php
session_start();
$username = isset($_SESSION['username']) ? htmlspecialchars($_SESSION['username']) : 'Guest';
$user_id = isset($_SESSION['user_id']) ? $_SESSION['user_id'] : null;
$usertype = isset($_SESSION['usertype']) ? $_SESSION['usertype'] : null;
?>

<!DOCTYPE html><html>
<head>
    <meta charset="utf-8" />
    <title>Open Charge Map - The global public registry of electric vehicle charging locations</title>
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="description" content="Open Charge Map is the global database of EV charging stations, managed and populated by EV drivers from all over the world." />
    <meta name="author" content="openchargemap.org" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <!-- Bootstrap + Design.css -->
    <link href="https://stackpath.bootstrapcdn.com/bootswatch/4.3.1/lux/bootstrap.min.css" rel="stylesheet">
    <link href="../css/styles.css" rel="stylesheet" />
    <link href="../css/search_filter.css" rel="stylesheet" />
    <!-- Font Awesome -->
    <link rel="stylesheet" href="//maxcdn.bootstrapcdn.com/font-awesome/4.3.0/css/font-awesome.min.css">
    <!-- Leaflet CSS -->
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="" crossorigin=""/>
    <!-- small extra CSS to style second bar, sidebar and map -->
    <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.css">
    <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.Default.css">
    <link href="../css/footer_design.css" rel="stylesheet" />
    <link href="../css/destination_design.css" rel="stylesheet" />
    <style>
        /* second control bar under the top navbar */
        .top-controls {
            position: fixed;
            top: 53px; /* same top offset you used earlier */
            left: 0;
            right: 0;
            height: 56px;
            background: #151515; /* dark like the screenshot */
            color: #fff;
            display: flex;
            align-items: center;
            padding: 6px 12px;
            z-index: 1050; /* above map but below navbar if needed */
            box-shadow: inset 0 -1px 0 rgba(255,255,255,0.02);
        }
        .top-controls .btn {
            color: #fff;
        }

        .search-wrapper {
            display:flex;
            align-items:center;
            flex: 1;
            margin: 0 12px;
            max-width: 1000px;
        }
        .search-wrapper .search-icon {
            margin-right:8px;
            opacity:0.7;
        }
        #search-input {
            width:100%;
            border-radius: 4px;
            border: none;
            padding: 10px 12px;
            background: #1f1f1f;
            color: #fff;
        }
        #search-input::placeholder { color: #bfbfbf; }

        .controls-right {
            display:flex;
            align-items:center;
            gap:8px;
        }

        /* Sidebar */
        .sidebar {
            position: fixed;
            top: 0;
            left: -320px;
            width: 320px;
            height: 100%;
            background: #111;
            color: #fff;
            z-index: 1100;
            transition: left 0.25s ease;
            box-shadow: 2px 0 8px rgba(0,0,0,0.4);
            padding-top: 72px; /* allow for top navbar */
        }
        .sidebar.open { left: 0; }
        .sidebar .sidebar-header {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 56px;
            display:flex;
            align-items:center;
            padding: 8px 12px;
            background: #0f0f0f;
            border-bottom: 1px solid rgba(255,255,255,0.04);
        }
        .sidebar .sidebar-header img { width:36px;height:36px;margin-right:8px; }
        .sidebar ul { list-style:none; padding:0; margin:0; }
        .sidebar ul li a {
            display:block;
            padding: 14px 18px;
            color: #ddd;
            text-decoration:none;
            border-bottom: 1px solid rgba(255,255,255,0.02);
        }
        .sidebar ul li a:hover { background:#171717; color:#fff; }

        /* Filter panel */
        .filter-panel {
            position: fixed;
            right: 16px;
            top: calc(53px + 56px + 12px);
            background: rgba(255,255,255,0.98);
            color:#222;
            padding:12px;
            border-radius:6px;
            box-shadow: 0 6px 18px rgba(0,0,0,0.25);
            display:none;
            z-index: 1200;
            min-width: 220px;
        }
        .filter-panel.open { display:block; }

        /* Map */
        #map {
            position: fixed;
            left: 0;
            right: 0;
            top: calc(53px + 56px); /* below navbar + controls */
            bottom: 0;
            z-index: 1;
        }

        /* small responsive tweaks */
        @media (max-width: 768px) {
            .search-wrapper { margin-left:8px; margin-right:8px; }
        }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>

    <style>
        .swal2-container {
            z-index: 99999 !important;
        }
    </style>
</head>
<body>
<!-- === top navbar (kept as-is from your source) === -->
<nav class="navbar navbar-expand-lg navbar-dark bg-primary fixed-top" role="navigation">
    <a class="navbar-brand" href="dashboard.php">Eco Navigator</a>
    <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#mainNav"
            aria-controls="mainNav" aria-expanded="false" aria-label="Toggle navigation">
        <span class="">...</span>
    </button>
    <div class="collapse navbar-collapse" id="mainNav">
        <ul class="navbar-nav mr-auto">
            <li class="nav-item active">
                <a class="nav-link" id="nav_home" href="dashboard.php">Home</a>
            </li>

            <?php if ($usertype == 1): // ADMIN ?>
                <li class="nav-item dropdown">
                    <a href="#" class="nav-link dropdown-toggle" data-toggle="dropdown">Management <b class="caret"></b></a>
                    <div class="dropdown-menu">
                        <a class="dropdown-item" href="../view/manage_location.php">Manage Location</a>
                        <a class="dropdown-item" href="../view/analysis.php">Analysis Report</a>
                        <a class="dropdown-item" href="/site/country">By Country</a>
                    </div>
                </li>
            <?php elseif ($usertype == 2): // REGISTERED USER ?>
                <li class="nav-item dropdown">
                    <a href="/site/poi" class="nav-link dropdown-toggle" data-toggle="dropdown">Browse <b class="caret"></b></a>
                    <div class="dropdown-menu">
                        <a class="dropdown-item" href="/site/country">By Country</a>
                    </div>
                </li>
            <?php endif; ?>

            <li class="nav-item dropdown">
                <a href="/site/about" class="nav-link dropdown-toggle" data-toggle="dropdown">About <b class="caret"></b></a>
                <div class="dropdown-menu">
                    <a class="dropdown-item" href="../view/about_us.php">About Us</a>
                    <a class="dropdown-item" href="../view/contact_us.php">Contact Us</a>
                </div>
            </li>

            <li class="nav-item dropdown">
                <a class="nav-link dropdown-toggle" href="#" id="profileDropdown" role="button"
                   data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                    My Profile
                </a>
                <div class="dropdown-menu" aria-labelledby="profileDropdown">
                    <?php if ($user_id): ?>
                        <a class="dropdown-item" href="../view/profile.php">Profile</a>
                        <?php if ($usertype == 2): // Only registered users ?>
                            <a class="dropdown-item" href="../view/view_history.php">View History</a>
                            <a class="dropdown-item" href="../view/bookmarks.php">Bookmark</a>
                        <?php endif; ?>
                        <div class="dropdown-divider"></div>
                        <a class="dropdown-item text-danger" href="../view/logout.php">Logout</a>
                    <?php else: ?>
                        <a class="dropdown-item" href="../view/login.php">Login</a>
                    <?php endif; ?>
                    <div class="dropdown-divider"></div>
                    <a class="dropdown-item" href="../view/about.php">About Us</a>
                </div>
            </li>
        </ul>
    </div>
</nav>

<!-- === second control bar: hamburger + search + location + filter === -->
<div class="top-controls">
    <button id="menu-toggle" class="btn btn-link" title="Open menu" style="margin-right:8px"><i class="fa fa-bars fa-lg"></i></button>

    <div class="search-wrapper" id="search-wrapper">
        <i class="fa fa-search search-icon" id="search-open"></i>

        <input id="search-input" type="search" placeholder="Search for place or address" />

        <i class="fa fa-times search-close" id="search-close"></i>
    </div>

    <div class="controls-right">
        <button id="direction-btn" class="btn btn-link" title="Get Directions">
            <i class="fa fa-location-arrow fa-lg"></i>
        </button>
        <button id="locate-btn" class="btn btn-link" title="Go to current location"><i class="fa fa-crosshairs fa-lg"></i></button>
        <button id="filter-btn" class="btn btn-link" title="Filters"><i class="fa fa-filter fa-lg"></i></button>
    </div>
</div>

<!-- === Direction Panel HTML === -->
<div id="direction-panel" class="direction-panel" style="display:none;">

    <div class="dir-header">
        <div class="dir-modes">
            <button class="mode-btn active" title="Driving"><i class="fa fa-car"></i></button>
            <button class="mode-btn" title="Walking"><i class="fa fa-male"></i></button>
        </div>

        <div class="d-flex align-items-center ml-auto">
            <button id="clear-route-btn" class="btn btn-sm btn-outline-light mr-3" style="display:none; font-size:12px; border-color:#555; color:#ccc;">Clear Route</button>
            <button id="close-dir-btn" class="close-btn" title="Close"><i class="fa fa-times fa-lg"></i></button>
        </div>
    </div>

    <div class="dir-body" style="flex-direction: column;">
        <div id="waypoints-container" class="w-100">
            <div class="waypoint-row position-relative mb-2" id="wp-row-start">
                <div class="d-flex align-items-center">
                    <div class="timeline-icon"><div class="dot-start"></div></div>
                    <input type="text" class="form-control dir-input waypoint-input" id="start-input" placeholder="Current Location" value="Current Location">
                </div>
                <div class="search-suggestions list-group" id="suggestions-start"></div>
            </div>

            <div class="waypoint-row position-relative mb-2" id="wp-row-0">
                <div class="d-flex align-items-center">
                    <div class="timeline-icon"><div class="dot-end"><i class="fa fa-map-marker"></i></div></div>
                    <input type="text" class="form-control dir-input waypoint-input dest-input-field" data-id="0" placeholder="Destination..." autocomplete="off">
                </div>
                <div class="search-suggestions list-group" id="suggestions-0"></div>
            </div>
        </div>

        <div class="text-right w-100 mb-2">
            <button id="add-stop-btn" class="btn btn-sm btn-link text-primary" style="font-size:12px;">
                <i class="fa fa-plus-circle"></i> Add Stop
            </button>
        </div>

        <button id="get-directions-btn" class="btn btn-primary btn-sm btn-block mt-1">Get Directions</button>

        <div id="route-alert-box" class="alert alert-warning mt-2 small" style="display:none; border-left: 4px solid #f39c12;">
            <i class="fa fa-bolt"></i> <b>Long Trip Detected!</b><br>
            A charging stop has been suggested near the midpoint.
        </div>
    </div>

    <div id="direction-results-list" class="dir-results-container">
        <div class="text-center text-muted mt-5" id="dir-placeholder">
            <i class="fa fa-map-signs fa-2x mb-3" style="opacity: 0.3;"></i>
            <p style="font-size: 0.9rem; opacity: 0.6;">Add up to 10 stops.<br>We'll find chargers along the way.</p>
        </div>
    </div>

    <div id="direction-details-view" class="dir-results-container" style="display:none;"></div>

    <div id="trip-summary-footer" class="trip-summary-footer" style="display:none;">
        <div class="row no-gutters">
            <div class="col-6 summary-option active-option" id="summary-drive-box">
                <div class="d-flex align-items-center justify-content-center flex-column p-2">
                    <i class="fa fa-car fa-lg mb-1 text-primary"></i>
                    <div class="sum-time" id="summary-car-time">-- min</div>
                    <div class="sum-dist small text-muted" id="summary-car-dist">-- km</div>
                </div>
            </div>
            <div class="col-6 summary-option" id="summary-walk-box">
                <div class="d-flex align-items-center justify-content-center flex-column p-2" style="border-left:1px solid #eee;">
                    <i class="fa fa-walking fa-lg mb-1 text-secondary"></i>
                    <div class="sum-time" id="summary-walk-time">-- min</div>
                    <div class="sum-dist small text-muted" id="summary-walk-dist">-- km</div>
                </div>
            </div>
        </div>
    </div>

</div>
<!-- === custom sidebar (opens from left) === -->
<nav id="sidebar" class="sidebar" aria-hidden="true">
    <div class="sidebar-header">
        <!--<img src="images/appicon_36x36.png" alt="logo"/> -->
        <strong style="margin-right:auto">Eco Navigator</strong>
        <button id="close-sidebar" class="btn btn-link" style="color:#bbb"><i class="fa fa-times"></i></button>
    </div>
    <ul class="sidebar-menu">
        <li><a href="../view/dashboard.php">Home</a></li>
        <li><a href="#" id="sidebar-search-trigger">Search</a></li>
        <li><a href="../view/bookmarks.php" >BookMark</a></li>
        <li><a href="../view/login.php">Sign In</a></li>
        <li><a href="../view/about_us.php">About</a></li>
    </ul>
</nav>

<!-- Filter Modal -->
<div id="filter-modal" class="filter-modal">
    <div class="filter-content">
        <h2>Search Filters</h2>
        <p class="note">Filters will remove locations without complete data.</p>

        <label>Country</label>
        <select id="filter-country">
            <option value="">All</option>
            <option value="MY">Malaysia</option>
        </select>

        <label>Network Operator</label>
        <input type="text" id="filter-operator" placeholder="Search network operators">

        <label>Usage</label>
        <select id="filter-usage">
            <option value="">All</option>
            <option value="Public">Public</option>
            <option value="Private">Private</option>
        </select>

        <label>Status</label>
        <select id="filter-status">
            <option value="">All</option>
            <option value="Operational">Operational</option>
            <option value="Planned">Planned</option>
        </select>

        <label>Connection Types</label>
        <select id="filter-connection">
            <option value="">All</option>
            <option value="Type2">Type 2</option>
            <option value="CHAdeMO">CHAdeMO</option>
        </select>

        <div class="filter-actions">
            <button id="apply-filter-btn">Apply</button>
            <button id="clear-filter-btn">Clear</button>
            <button id="close-filter-btn">Close</button>
        </div>
    </div>
</div>

<!-- === Leaflet map (replaces the iframe) === -->
<div id="map">
    <div id="search-area-btn">Search this area</div>
</div>
<!-- jQuery + Bootstrap JS (kept as in your original head) -->
<script src="https://code.jquery.com/jquery-3.4.1.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.14.7/umd/popper.min.js"></script>
<script src="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/js/bootstrap.min.js"></script>
<!-- Leaflet JS -->
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script> const USER_ID = <?php echo $user_id ? $user_id : 'null'; ?>;</script>
<!-- Map JS -->
<script src="../js/map.js"></script>
<script src="../js/destination_func.js"></script>
<script>
    function goToProfile() {
        <?php
        if (isset($user_id) && $user_id) {
            echo "window.location.href = '../view/profile.php';";
        } else {
            echo "window.location.href = '../view/login.php';";
        }
        ?>
    }
</script>
<script>
    $(document).ready(function() {
        // 1. Open Directions Mode
        $('#direction-btn').click(function() {
            // Hide original headers
            $('.navbar').slideUp(200);
            $('.top-controls').slideUp(200);

            // Show direction panel
            $('#direction-panel').fadeIn(200);

            // Adjust map top position to 0 since headers are gone
            $('#map').animate({ top: '0' }, 200);
        });

        // 2. Close Directions Mode (The "X" button)
        $('#close-dir-btn').click(function() {
            // Hide direction panel
            $('#direction-panel').fadeOut(200);

            // Show original headers
            $('.navbar').slideDown(200);
            $('.top-controls').slideDown(200);

            // Reset map top position (approx 109px based on your CSS: 53px nav + 56px controls)
            $('#map').animate({ top: '109px' }, 200);
        });
    });
</script>
<script>
    function adjustForMobile() {
        if ($(window).width() < 768) {
            // If sidebar is open, hide the map or reduce its height
            if ($('#sidebar').hasClass('active')) {
                $('#map').css('height', '30vh');
            } else {
                $('#map').css('height', 'calc(100vh - 160px)');
            }
        } else {
            // Screen is big again! Remove the inline height
            // so your CSS (bottom: 0) can take over.
            $('#map').css('height', '');
        }
    }

    $(window).on('resize', adjustForMobile);
</script>
<script src="https://unpkg.com/leaflet.markercluster@1.4.1/dist/leaflet.markercluster.js"></script>

<!-- AI Chatbot -->
<script>
    const CURRENT_USER = {
        id: "<?php echo isset($_SESSION['user_id']) ? $_SESSION['user_id'] : ''; ?>",
        name: "<?php echo isset($_SESSION['username']) ? htmlspecialchars($_SESSION['username']) : 'Guest'; ?>",
        usertype: "<?php echo isset($_SESSION['usertype']) ? $_SESSION['usertype'] : ''; ?>",
        isRegistered: <?php echo (isset($_SESSION['usertype']) && $_SESSION['usertype'] == 2) ? 'true' : 'false'; ?>
    };
</script>
<script>
    const wrapper = document.getElementById("search-wrapper");
    const openBtn = document.getElementById("search-open");
    const closeBtn = document.getElementById("search-close");
    const input = document.getElementById("search-input");
    const controlsRight = document.querySelector(".controls-right");

    openBtn.addEventListener("click", () => {
        if (window.innerWidth <= 768) {
            wrapper.classList.add("active");
            if (controlsRight) controlsRight.style.display = "none";
            input.focus();
        }
    });

    closeBtn.addEventListener("click", () => {
        wrapper.classList.remove("active");
        if (controlsRight) controlsRight.style.display = "flex";
        input.value = "";
    });
</script>
<link rel="stylesheet" href="../css/chat_bot_design.css">
<?php include 'chat_bot.php'; ?>
<script src="../js/chat_bot_func.js"></script>
<!---->
<?php include("../view/Footer.php"); ?>
</body>
</html>