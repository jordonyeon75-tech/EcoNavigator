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
    <title>My Bookmarks</title>
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
    <h1>My Bookmarks</h1>

    <div class="actions">
        <div id="normal-actions">
            <button class="btn-manage" onclick="toggleManageMode()">Manage Bookmarks</button>
        </div>

        <div id="delete-actions" style="display: none; gap: 10px;">
            <button class="btn-cancel" onclick="toggleManageMode()">Cancel</button>
            <button class="btn-delete-selected" onclick="deleteSelected()">Delete Selected</button>
            <button class="btn-delete-all" onclick="deleteAllBookmarks()">Delete All</button>
        </div>
    </div>

    <table id="bookmark-table" class="main-table">
        <thead>
        <tr>
            <th class="th-checkbox"><div class="checkbox-wrapper"><input type="checkbox" id="select-all" onclick="toggleSelectAll(this)"></div></th>
            <th>No.</th>
            <th>List Name</th>
            <th>Location Name</th>
            <th>Address</th>
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

    function loadBookmarks(page = 1) {
        currentPage = page;
        document.getElementById('select-all').checked = false;

        $.getJSON('../controller/LocationController.php?action=getBookmarks&page=' + page, function(data) {
            const tbody = $("#bookmark-table tbody");
            tbody.empty();

            if (!data.bookmarks || !data.bookmarks.length) {
                tbody.append("<tr><td colspan='7' style='text-align:center;'>No bookmarks found.</td></tr>");
                $("#pagination").empty();
                return;
            }

            data.bookmarks.forEach((b, index) => {
                const rowNum = ((page - 1) * 10) + index + 1;
                tbody.append(`
            <tr>
                <td class="td-checkbox"><div class="checkbox-wrapper"><input type="checkbox" class="bookmark-checkbox" value="${b.id}"></div></td>
                <td>${rowNum}</td>
                <td>${b.list_name || '-'}</td>
                <td>${b.name}</td>
                <td>${b.address}</td>
                <td><button class="btn-navigate" onclick="openGoogleMaps(${b.lat}, ${b.lng})">Navigate</button></td>
                <td><button class="btn-delete" onclick="deleteBookmark([${b.id}])">Delete</button></td>
            </tr>
            `);
            });

            let paginationHTML = '';
            if (data.totalPages > 1) {
                for (let i = 1; i <= data.totalPages; i++) {
                    const activeClass = (i === data.currentPage) ? 'active-page' : '';
                    paginationHTML += `<button class="${activeClass}" onclick="loadBookmarks(${i})">${i}</button>`;
                }
            }
            $("#pagination").html(paginationHTML);
        });
    }

    $(document).ready(() => loadBookmarks());

    // --- MANAGE MODE TOGGLE ---
    function toggleManageMode() {
        const table = document.getElementById('bookmark-table');
        table.classList.toggle('delete-mode'); // Turns on smooth CSS animation

        if (table.classList.contains('delete-mode')) {
            $('#normal-actions').hide();
            $('#delete-actions').fadeIn(300); // Smoothly fades in buttons
        } else {
            $('#delete-actions').hide();
            $('#normal-actions').fadeIn(300);

            // Uncheck everything if they hit cancel
            document.getElementById('select-all').checked = false;
            document.querySelectorAll('.bookmark-checkbox').forEach(cb => cb.checked = false);
        }
    }

    // --- 1. DELETE SELECTED ---
    function deleteSelected() {
        let selected = [];
        document.querySelectorAll('.bookmark-checkbox:checked').forEach(cb => selected.push(cb.value));

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
            text: `You are about to delete ${selected.length} item(s). This cannot be undone.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',   // Red button for deleting
            cancelButtonColor: '#6c757d', // Grey cancel button
            confirmButtonText: 'Yes, delete them!'
        }).then((result) => {
            if (result.isConfirmed) {
                deleteBookmark(selected);
            }
        });
    }

    // --- 2. EXECUTE DELETE ---
    function deleteBookmark(bookmarkIds) {
        $.post('../controller/LocationController.php?action=deleteBookmark', {ids: bookmarkIds}, function(response) {
            if (response.success) {
                // Success popup
                Swal.fire({
                    icon: 'success',
                    title: 'Deleted!',
                    text: 'Your selected bookmarks have been deleted.',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 3000
                });

                // Exit manage mode and reload table
                document.getElementById('bookmark-table').classList.remove('delete-mode');
                $('#delete-actions').hide();
                $('#normal-actions').show();
                loadBookmarks(currentPage);
            }
        }, 'json');
    }

    // --- 3. DELETE ALL ---
    function deleteAllBookmarks() {
        // SweetAlert Confirmation for Delete All
        Swal.fire({
            title: 'Delete EVERYTHING?',
            text: "Are you sure you want to clear ALL your bookmarks? This cannot be undone!",
            icon: 'error', // Use error icon for extreme danger actions
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Yes, wipe it all!'
        }).then((result) => {
            if (result.isConfirmed) {
                $.post('../controller/LocationController.php?action=deleteAllBookmarks', {}, function(response) {
                    if (response.success) {
                        Swal.fire({
                            icon: 'success',
                            title: 'All Cleared!',
                            text: response.message,
                            toast: true,
                            position: 'top-end',
                            showConfirmButton: false,
                            timer: 3000
                        });

                        document.getElementById('bookmark-table').classList.remove('delete-mode');
                        $('#delete-actions').hide();
                        $('#normal-actions').show();
                        loadBookmarks(1);
                    } else {
                        Swal.fire('Error', response.message, 'error');
                    }
                }, 'json');
            }
        });
    }
</script>

</body>
</html>