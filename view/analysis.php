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
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <style>
        .swal2-container {
            z-index: 99999 !important;
        }
    </style>
</head>
<body>

<header class="page-header">
<h1>Admin Analysis Dashboard</h1>
    <a href="dashboard.php" class="home-btn">Home</a>
</header>

<!-- ===== TOP CARDS ===== -->
<div class="dashboard-cards">
    <div class="summary-card card-blue" id="total-worldwide">Loading...</div>
    <div class="summary-card card-green" id="total-malaysia">
        Loading...
        <button id="malaysia-report-btn" class="malaysia-report-btn">Report</button>
    </div>
    <div class="summary-card card-orange" id="total-usage">Loading...</div>
    <div class="summary-card card-purple" id="total-users">Loading...</div>
</div>

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

<!-- REPORT MODAL -->
<div id="report-modal" class="modal" aria-hidden="true">
    <div class="modal-content">
        <button class="modal-close" id="close-report">✕</button>
        <h2 id="report-title">Station Report</h2>

        <div id="report-body">
            <!-- populated by JS -->
        </div>

        <div class="report-controls">
            <select id="report-period">
                <option value="">Select period</option>
                <option value="day">Day</option>
                <option value="week">Weekly</option>
                <option value="month">Monthly</option>
                <option value="year">Yearly</option>
            </select>

            <!-- Dynamic date inputs -->
            <div id="date-inputs" class="date-inputs"></div>

            <button id="print-report">Print Report</button>
        </div>
    </div>
</div>

<!-- DATA MODAL -->
<div id="data-modal" class="modal" aria-hidden="true">
    <div class="modal-content">
        <button class="modal-close" id="close-data">✕</button>
        <h2 id="data-title">Station Data</h2>

        <!-- Dynamic filters -->
        <div class="report-controls">
            <select id="data-period">
                <option value="">Select period</option>
                <option value="day">Day</option>
                <option value="week">Weekly</option>
                <option value="month">Monthly</option>
                <option value="year">Yearly</option>
            </select>
            <div id="data-date-inputs" class="date-inputs"></div>
            <button id="print-data">Print Data</button>
        </div>

        <!-- Data modal body -->
        <div id="data-body"></div>
    </div>
</div>

<!-- MALAYSIA REPORT MODAL -->
<div id="malaysia-report-modal" class="modal" aria-hidden="true">
    <div class="modal-content">
        <button class="modal-close" id="close-malaysia-report">✕</button>
        <h2>Report: Malaysia Overall EV Charging Stations</h2>

        <div class="report-controls">
            <select id="malaysia-brand">
                <option value="">Select EV Brand</option>
                <option value="all">All Brands</option>
                <option value="Tesla">Tesla</option>
                <option value="ChargeSini">ChargeSini</option>
                <option value="Shell Recharge">Shell Recharge</option>
                <option value="BMW Charging">BMW Charging</option>
            </select>

            <select id="malaysia-period">
                <option value="">Select Period</option>
                <option value="day">Day</option>
                <option value="week">Week</option>
                <option value="month">Month</option>
                <option value="year">Year</option>
            </select>

            <div id="malaysia-date-inputs" class="date-inputs"></div>
            <button id="print-malaysia-report">Print Report</button>
        </div>

        <div id="malaysia-report-body">
            <div id="malaysia-chart-container" style="text-align:center; margin-top:15px;">
                <canvas id="malaysiaChart" width="600" height="300"></canvas>
            </div>
        </div>
    </div>
</div>
<!-- Hidden print area -->
<div id="printable-area" class="printable" style="display:none;"></div>

<!-- Hidden canvases for charts (used only in print) -->
<div style="display:none">
    <canvas id="usageChart" width="600" height="300"></canvas>
    <canvas id="connectorChart" width="400" height="300"></canvas>
</div>

<script src="../js/analysis.js"></script>
</body>
</html>