<?php
session_start();
if (!isset($_SESSION['user_id'])) {
    header('Location: login.php');
    exit;
}
?>
<!DOCTYPE html>
<html>
<head>
    <title>My View History</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="../css/styles.css">
    <link rel="stylesheet" href="../css/design_table.css">
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <style>
        .swal2-container { z-index: 99999 !important; }
    </style>
</head>
<body>

<div class="table-container">
    <h1>My View History</h1>

    <div class="actions">
        <div id="normal-actions">
            <button class="btn-manage" onclick="toggleManageMode()">Manage History</button>
        </div>

        <div id="delete-actions" style="display: none; gap: 10px;">
            <button class="btn-cancel" onclick="toggleManageMode()">Cancel</button>
            <button class="btn-delete-selected" onclick="deleteSelected()">Delete Selected</button>
            <button class="btn-delete-all" onclick="deleteAllHistory()">Delete All History</button>
        </div>
    </div>

    <table id="history-table" class="main-table">
        <thead>
        <tr>
            <th class="th-checkbox"><div class="checkbox-wrapper"><input type="checkbox" id="select-all" onclick="toggleSelectAll(this)"></div></th>
            <th>No.</th>
            <th>Location Name</th>
            <th>Address</th>
            <th>Viewed On</th>
            <th>Navigate</th>
            <th>Action</th>
        </tr>
        </thead>
        <tbody></tbody>
    </table>

    <div class="pagination" id="pagination"></div>
</div> <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
</div>

<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
<script>
    function openGoogleMaps(lat, lon) {
        if (!lat || !lon) {
            alert("Location coordinates not available.");
            return;
        }
        window.open(`https://www.google.com/maps?q=${lat},${lon}`, "_blank");
    }

    let currentPage = 1;

    function loadHistory(page = 1) {
        currentPage = page;
        document.getElementById('select-all').checked = false;

        $.getJSON('../controller/LocationController.php?action=getHistory&page=' + page, function(data) {
            const tbody = $("#history-table tbody");
            tbody.empty();

            if (!data.history || !data.history.length) {
                tbody.append("<tr><td colspan='7' style='text-align:center;'>No viewing history yet.</td></tr>");
                $("#pagination").empty();
                return;
            }

            data.history.forEach((h, index) => {
                const rowNum = ((page - 1) * 10) + index + 1;
                tbody.append(`
            <tr>
                <td class="td-checkbox"><div class="checkbox-wrapper"><input type="checkbox" class="history-checkbox" value="${h.history_id}"></div></td>
                <td>${rowNum}</td>
                <td>${h.name}</td>
                <td>${h.address}</td>
                <td>${new Date(h.timestamp).toLocaleString()}</td>
                <td><button class="btn-navigate" onclick="openGoogleMaps(${h.lat}, ${h.lng})">Navigate</button></td>
                <td>
                    <button class="btn-delete" onclick="deleteHistory([${h.history_id}])">Delete</button>
                </td>
            </tr>
            `);
            });

            let paginationHTML = '';
            if (data.totalPages > 1) {
                for (let i = 1; i <= data.totalPages; i++) {
                    const activeClass = (i === data.currentPage) ? 'active-page' : '';
                    paginationHTML += `<button class="${activeClass}" onclick="loadHistory(${i})">${i}</button>`;
                }
            }
            $("#pagination").html(paginationHTML);
        });
    }

    $(document).ready(() => loadHistory());

    // --- MANAGE MODE TOGGLE ---
    function toggleManageMode() {
        const table = document.getElementById('history-table');
        table.classList.toggle('delete-mode');

        if (table.classList.contains('delete-mode')) {
            $('#normal-actions').hide();
            $('#delete-actions').fadeIn(300);
        } else {
            $('#delete-actions').hide();
            $('#normal-actions').fadeIn(300);
            document.getElementById('select-all').checked = false;
            document.querySelectorAll('.history-checkbox').forEach(cb => cb.checked = false);
        }
    }

    function toggleSelectAll(source) {
        document.querySelectorAll('.history-checkbox').forEach(cb => cb.checked = source.checked);
    }

    function deleteSelected() {
        const selected = [];
        document.querySelectorAll('.history-checkbox:checked').forEach(cb => selected.push(cb.value));

        if (selected.length === 0) {
            alert("Please select at least one item to delete.");
            return;
        }

        if (confirm(`Are you sure you want to delete ${selected.length} item(s)?`)) {
            deleteHistory(selected);
        }
    }

    // --- 1. DELETE SELECTED ---
    function deleteSelected() {
        const selected = [];
        document.querySelectorAll('.history-checkbox:checked').forEach(cb => selected.push(cb.value));

        if (selected.length === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'No Items Selected',
                text: 'Please select at least one item to delete.',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000
            });
            return;
        }

        // SweetAlert Confirmation for Delete Selected
        Swal.fire({
            title: 'Are you sure?',
            text: `You are about to delete ${selected.length} item(s) from your history.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',   // Red button for deleting
            cancelButtonColor: '#6c757d', // Grey cancel button
            confirmButtonText: 'Yes, delete them!'
        }).then((result) => {
            if (result.isConfirmed) {
                deleteHistory(selected);
            }
        });
    }

    // --- 2. EXECUTE DELETE ---
    function deleteHistory(historyIds) {
        $.post('../controller/LocationController.php?action=deleteHistory', {ids: historyIds}, function(response) {
            if (response.success) {
                // Success popup
                Swal.fire({
                    icon: 'success',
                    title: 'Deleted!',
                    text: 'Your selected history items have been removed.',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 3000
                });

                // Exit manage mode and reload table
                document.getElementById('history-table').classList.remove('delete-mode');
                $('#delete-actions').hide();
                $('#normal-actions').show();
                loadHistory(currentPage);
            }
        }, 'json');
    }

    // --- 3. DELETE ALL ---
    function deleteAllHistory() {
        // SweetAlert Confirmation for Delete All
        Swal.fire({
            title: 'Clear ALL History?',
            text: "Are you sure you want to clear ALL your viewing history? This cannot be undone!",
            icon: 'error', // Error icon because this wipes everything
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Yes, wipe it all!'
        }).then((result) => {
            if (result.isConfirmed) {
                $.post('../controller/LocationController.php?action=deleteAllHistory', {}, function(response) {
                    if (response.success) {
                        Swal.fire({
                            icon: 'success',
                            title: 'History Cleared!',
                            text: response.message || 'All view history cleared.',
                            toast: true,
                            position: 'top-end',
                            showConfirmButton: false,
                            timer: 3000
                        });

                        document.getElementById('history-table').classList.remove('delete-mode');
                        $('#delete-actions').hide();
                        $('#normal-actions').show();
                        loadHistory(1);
                    } else {
                        Swal.fire('Error', response.message || 'Failed to clear history', 'error');
                    }
                }, 'json');
            }
        });
    }
</script>

</body>
</html>