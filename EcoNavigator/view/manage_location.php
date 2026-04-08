<?php
session_start();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Analysis</title>

    <link rel="stylesheet" href="../css/analysis_design.css">
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
</head>
<body>

<header class="page-header">
    <h1>Admin Management Stations</h1>
    <a href="dashboard.php" class="home-btn">Home</a>
</header>

<!-- ===== FILTERS ===== -->
<div class="filters-panel">
    <div class="filters-row">
        <div class="filter-item">
            <label for="filter-country">Country</label>
            <select id="filter-country">
                <option value="">All Countries</option>
            </select>
        </div>
        <div class="filter-item">
            <label for="filter-state">State</label>
            <select id="filter-state">
                <option value="">All States</option>
            </select>
        </div>
        <div class="filter-item">
            <label for="filter-search">Location / Name</label>
            <input id="filter-search" placeholder="Search station name or address" />
        </div>
        <div class="filter-actions">
            <button id="apply-filter">Apply Filter</button>
            <button id="clear-filter" class="btn-clear">Clear</button>
        </div>
        <div class="filter-item">
            <label for="filter-status">Status</label>
            <select id="filter-status">
                <option value="">All Status</option>
                <option value="Available">Available</option>
                <option value="Out of Service">Out of Service</option>
                <option value="Under Maintain">Under Maintain</option>
            </select>
        </div>
    </div>
</div>

<!-- ===== STATION CARDS ===== -->
<main>
    <div id="result-count" class="result-count"></div>
    <div class="stations-grid" id="stations-container">
        <!-- Cards injected by JS -->
    </div>

    <!-- Pagination -->
    <div class="pagination" id="pagination"></div>
</main>

<script src="../js/manage_map.js"></script>
</body>
</html>