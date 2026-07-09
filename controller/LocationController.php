<?php
// controller/LocationController.php
session_start();
require_once __DIR__ . '/../model/LocationModel.php';

$locationModel = new LocationModel();
header('Content-Type: application/json');

// 1. Identify the user (or null if guest)
$userId = isset($_SESSION['user_id']) ? $_SESSION['user_id'] : null;
session_write_close();

$action = $_GET['action'] ?? '';

// 2. Define actions that DO NOT require login
$publicActions = ['getFeedback', 'getRatings'];

// 3. Check if login is required for the requested action
if (!$userId && !in_array($action, $publicActions)) {
    echo json_encode(['success' => false, 'message' => 'Login required']);
    exit;
}

switch ($action) {
    case 'bookmark':
        $isApi = isset($_POST['is_api']) && $_POST['is_api'] == '1';

        if ($isApi) {
            // Prepare API location data
            $ocmData = [
                'name' => $_POST['name'],
                'address' => $_POST['address'],
                'lat' => $_POST['lat'],
                'lng' => $_POST['lng'],
                'categories' => $_POST['categories'] ?? '',
                'type' => $_POST['type'] ?? '',
                'voltage' => $_POST['voltage'] ?? '',
                'image' => $_POST['image'] ?? ''
            ];
            $locationId = $locationModel->saveOCMLocationIfNotExists($ocmData);
        } else {
            $locationId = intval($_POST['location_id']);
        }

        $result = $locationModel->addBookmark($userId, $locationId);

        if ($result === "exists") {
            echo json_encode(['success' => false, 'message' => 'Already bookmarked']);
        } elseif ($result === true) {
            echo json_encode(['success' => true, 'message' => 'Bookmarked successfully']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Failed to bookmark']);
        }
        break;

    case 'feedback':
        $locationId = intval($_POST['location_id']);
        $feedback = trim($_POST['feedback']);
        $result = $locationModel->addFeedback($userId, $locationId, $feedback);

        if ($result === "exists") {
            echo json_encode(['success' => false, 'message' => 'You already left feedback for this location']);
        } else {
            echo json_encode(['success' => $result]);
        }
        break;

    case 'deleteFeedback':
        $feedbackId = intval($_POST['id']);
        $result = $locationModel->deleteFeedback($userId, $feedbackId);
        echo json_encode([
            'success' => $result,
            'message' => $result ? 'Feedback deleted successfully' : 'Failed to delete feedback'
        ]);
        break;

    case 'getFeedback':
        $locationId = intval($_GET['location_id']);
        $feedback = $locationModel->getFeedback($locationId);
        echo json_encode($feedback);
        break;

    case 'rating':
        $locationId = intval($_POST['location_id']);
        $rating = intval($_POST['rating']);
        $result = $locationModel->addOrUpdateRating($userId, $locationId, $rating);
        echo json_encode(['success' => $result]);
        break;

    case 'deleteRating':
        $locationId = intval($_POST['location_id']);
        $result = $locationModel->deleteRating($userId, $locationId);
        echo json_encode([
            'success' => $result,
            'message' => $result ? 'Rating deleted successfully' : 'Failed to delete rating'
        ]);
        break;

    case 'getRatings':
        $locationId = intval($_GET['location_id']);

        // Get average rating, total ratings, and user's own rating
        $ratingsData = $locationModel->getRatings($locationId, $userId);

        echo json_encode([
            'success' => true,
            'avg_rating' => $ratingsData['avg_rating'],
            'total' => $ratingsData['total'],
            'user_rating' => $ratingsData['user_rating']
        ]);
        break;

    case 'getBookmarks':
        $limit = 10; // show 10 per page
        $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
        $offset = ($page - 1) * $limit;

        $bookmarks = $locationModel->getBookmarks($userId, $limit, $offset);
        $total = $locationModel->countBookmarks($userId);
        $totalPages = ceil($total / $limit);

        echo json_encode([
            'bookmarks' => $bookmarks,
            'totalPages' => $totalPages,
            'currentPage' => $page
        ]);
        break;

    case 'deleteBookmark':
        // Expecting an array of IDs from the frontend
        $bookmarkIds = isset($_POST['ids']) ? $_POST['ids'] : [];

        // Fallback just in case a single ID is passed old-style
        if (empty($bookmarkIds) && isset($_POST['id'])) {
            $bookmarkIds = [$_POST['id']];
        }

        if (empty($bookmarkIds)) {
            echo json_encode(['success' => false, 'message' => 'No items selected']);
            break;
        }

        $success = $locationModel->deleteBookmarksBulk($userId, $bookmarkIds);
        echo json_encode(['success' => $success, 'message' => $success ? 'Item(s) deleted' : 'Failed to delete']);
        break;

    case 'deleteAllBookmarks':
        $success = $locationModel->deleteAllBookmarks($userId);
        echo json_encode(['success' => $success, 'message' => $success ? 'All bookmarks cleared' : 'Failed to clear bookmarks']);
        break;

    // --- HISTORY ACTIONS ---
    case 'addHistory':
        $isApi = isset($_POST['is_api']) && $_POST['is_api'] == '1';

        if ($isApi) {
            $ocmData = [
                'name' => $_POST['name'],
                'address' => $_POST['address'],
                'lat' => $_POST['lat'],
                'lng' => $_POST['lng'],
                'categories' => $_POST['categories'] ?? '',
                'type' => $_POST['type'] ?? '',
                'voltage' => $_POST['voltage'] ?? '',
                'image' => $_POST['image'] ?? ''
            ];
            $locationId = $locationModel->saveOCMLocationIfNotExists($ocmData);
        } else {
            $locationId = intval($_POST['location_id']);
        }

        $result = $locationModel->addHistory($userId, $locationId);
        echo json_encode(['success' => $result]);
        break;

    case 'getHistory':
        $limit = 10;
        $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
        $offset = ($page - 1) * $limit;

        $history = $locationModel->getHistory($userId, $limit, $offset);
        $total = $locationModel->countHistory($userId);
        $totalPages = ceil($total / $limit);

        echo json_encode([
            'history' => $history,
            'totalPages' => $totalPages,
            'currentPage' => $page
        ]);
        break;

    case 'deleteHistory':
        // Expecting an array of IDs from the frontend
        $historyIds = isset($_POST['ids']) ? $_POST['ids'] : [];
        if (empty($historyIds)) {
            echo json_encode(['success' => false, 'message' => 'No items selected']);
            break;
        }

        $success = $locationModel->deleteHistory($userId, $historyIds);
        echo json_encode(['success' => $success, 'message' => $success ? 'Item(s) deleted' : 'Failed to delete']);
        break;

    case 'deleteAllHistory':
        $success = $locationModel->deleteAllHistory($userId);
        echo json_encode(['success' => $success, 'message' => $success ? 'All history cleared' : 'Failed to clear history']);
        break;

    default:
        echo json_encode(['success' => false, 'message' => 'Invalid action']);


}