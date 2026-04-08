<?php
// model/LocationModel.php
require_once __DIR__ . '/../config/database.php';

class LocationModel {
    private $pdo;

    public function __construct() {
        $db = new Database();
        $this->pdo = $db->getConnection();
    }

    public function addBookmark($userId, $locationId, $listName = null) {
        // Check if already bookmarked
        $check = $this->pdo->prepare("SELECT COUNT(*) FROM bookmark WHERE user_id = ? AND location_id = ?");
        $check->execute([$userId, $locationId]);
        if ($check->fetchColumn() > 0) {
            return "exists"; // Already bookmarked
        }

        // Insert new bookmark
        $stmt = $this->pdo->prepare("INSERT INTO bookmark (user_id, location_id, list_name) VALUES (?, ?, ?)");
        return $stmt->execute([$userId, $locationId, $listName]) ? true : false;
    }

    public function addFeedback($userId, $locationId, $feedback) {
        $check = $this->pdo->prepare("SELECT id FROM feedback WHERE user_id = ? AND location_id = ?");
        $check->execute([$userId, $locationId]);
        if ($check->fetch()) return "exists";

        $stmt = $this->pdo->prepare("INSERT INTO feedback (user_id, location_id, feedback) VALUES (?, ?, ?)");
        return $stmt->execute([$userId, $locationId, $feedback]);
    }

    public function deleteFeedback($userId, $feedbackId) {
        $stmt = $this->pdo->prepare("DELETE FROM feedback WHERE id = ? AND user_id = ?");
        return $stmt->execute([$feedbackId, $userId]);
    }

    public function getFeedback($locationId) {
        $stmt = $this->pdo->prepare("
        SELECT f.id, f.feedback, f.timestamp, u.username, f.user_id
        FROM feedback f
        JOIN users u ON f.user_id = u.id
        WHERE f.location_id = ?
        ORDER BY f.timestamp DESC
    ");
        $stmt->execute([$locationId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

// Add or Update Rating
    public function addOrUpdateRating($userId, $locationId, $rating) {
        // Check if rating exists
        $check = $this->pdo->prepare("SELECT id FROM rating WHERE user_id = ? AND location_id = ?");
        $check->execute([$userId, $locationId]);
        $existing = $check->fetchColumn();

        if ($existing) {
            // Update existing rating
            $stmt = $this->pdo->prepare("UPDATE rating SET rating = ?, timestamp = CURRENT_TIMESTAMP WHERE id = ?");
            return $stmt->execute([$rating, $existing]);
        } else {
            // Insert new rating
            $stmt = $this->pdo->prepare("INSERT INTO rating (user_id, location_id, rating) VALUES (?, ?, ?)");
            return $stmt->execute([$userId, $locationId, $rating]);
        }
    }

// Delete Rating
    public function deleteRating($userId, $locationId) {
        $stmt = $this->pdo->prepare("DELETE FROM rating WHERE location_id = ? AND user_id = ?");
        return $stmt->execute([$locationId, $userId]);
    }

    public function getRatings($locationId, $userId = null) {
        // Get avg rating & total count
        $stmt = $this->pdo->prepare("SELECT AVG(rating) as avg_rating, COUNT(*) as total FROM rating WHERE location_id = ?");
        $stmt->execute([$locationId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        $avg_rating = $row ? floatval($row['avg_rating']) : 0;
        $total = $row ? intval($row['total']) : 0;

        // Get this user's rating
        $user_rating = 0;
        if ($userId) {
            $stmt = $this->pdo->prepare("SELECT rating FROM rating WHERE location_id = ? AND user_id = ?");
            $stmt->execute([$locationId, $userId]);
            $userRow = $stmt->fetch(PDO::FETCH_ASSOC);
            $user_rating = $userRow ? intval($userRow['rating']) : 0;
        }

        return [
            'avg_rating' => $avg_rating,
            'total' => $total,
            'user_rating' => $user_rating
        ];
    }

    public function saveOCMLocationIfNotExists($ocmData) {
        // Check if this API location already exists
        $stmt = $this->pdo->prepare("SELECT id FROM location WHERE name = ? AND lat = ? AND lng = ?");
        $stmt->execute([
            $ocmData['name'],
            $ocmData['lat'],
            $ocmData['lng']
        ]);
        $existing = $stmt->fetchColumn();
        if ($existing) return $existing;

        // Insert new location
        $stmt = $this->pdo->prepare("
        INSERT INTO location 
        (name, address, image, pricing, total_parking, available_parking, lng, lat, categories, type, voltage) 
        VALUES (?, ?, ?, 0, 0, 0, ?, ?, ?, ?, ?)
    ");
        $stmt->execute([
            $ocmData['name'],
            $ocmData['address'],
            $ocmData['image'] ?? '',
            $ocmData['lng'],
            $ocmData['lat'],
            $ocmData['categories'] ?? '',
            $ocmData['type'] ?? '',
            $ocmData['voltage'] ?? ''
        ]);
        return $this->pdo->lastInsertId();
    }

    public function getBookmarks($userId, $limit = 10, $offset = 0) {
        $stmt = $this->pdo->prepare("
        SELECT b.id, b.list_name, l.name, l.address, l.lat, l.lng
        FROM bookmark b
        JOIN location l ON b.location_id = l.id
        WHERE b.user_id = ?
        ORDER BY b.id ASC
        LIMIT ? OFFSET ?
    ");
        $stmt->bindValue(1, $userId, PDO::PARAM_INT);
        $stmt->bindValue(2, $limit, PDO::PARAM_INT);
        $stmt->bindValue(3, $offset, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function countBookmarks($userId) {
        $stmt = $this->pdo->prepare("SELECT COUNT(*) FROM bookmark WHERE user_id = ?");
        $stmt->execute([$userId]);
        return $stmt->fetchColumn();
    }

    // --- BULK BOOKMARK DELETION ---
    public function deleteBookmarksBulk($userId, $bookmarkIds) {
        if (!is_array($bookmarkIds)) {
            $bookmarkIds = [$bookmarkIds];
        }
        $successCount = 0;

        // Loop through and use your existing deleteBookmark logic
        // to ensure orphan locations are safely cleaned up!
        foreach ($bookmarkIds as $id) {
            if ($this->deleteBookmark($userId, $id)) {
                $successCount++;
            }
        }
        return $successCount > 0;
    }

    public function deleteAllBookmarks($userId) {
        // Grab all of this user's bookmark IDs
        $stmt = $this->pdo->prepare("SELECT id FROM bookmark WHERE user_id = ?");
        $stmt->execute([$userId]);
        $ids = $stmt->fetchAll(PDO::FETCH_COLUMN);

        // If they have no bookmarks, return true
        if (empty($ids)) return true;

        // Pass the IDs to the bulk delete function
        return $this->deleteBookmarksBulk($userId, $ids);
    }

    // --- HISTORY FUNCTIONS ---

    public function addHistory($userId, $locationId) {
        // Check if history already exists for this user and location
        $check = $this->pdo->prepare("SELECT id FROM history WHERE user_id = ? AND location_id = ?");
        $check->execute([$userId, $locationId]);

        if ($check->fetchColumn() > 0) {
            // Update timestamp so it moves to the top of the history list
            $stmt = $this->pdo->prepare("UPDATE history SET timestamp = CURRENT_TIMESTAMP WHERE user_id = ? AND location_id = ?");
            return $stmt->execute([$userId, $locationId]);
        }

        $stmt = $this->pdo->prepare("INSERT INTO history (user_id, location_id) VALUES (?, ?)");
        return $stmt->execute([$userId, $locationId]);
    }

    public function getHistory($userId, $limit = 10, $offset = 0) {
        $stmt = $this->pdo->prepare("
            SELECT h.id as history_id, h.timestamp, l.name, l.address, l.lat, l.lng
            FROM history h
            JOIN location l ON h.location_id = l.id
            WHERE h.user_id = ?
            ORDER BY h.timestamp DESC
            LIMIT ? OFFSET ?
        ");
        $stmt->bindValue(1, $userId, PDO::PARAM_INT);
        $stmt->bindValue(2, $limit, PDO::PARAM_INT);
        $stmt->bindValue(3, $offset, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function countHistory($userId) {
        $stmt = $this->pdo->prepare("SELECT COUNT(*) FROM history WHERE user_id = ?");
        $stmt->execute([$userId]);
        return $stmt->fetchColumn();
    }

    public function deleteHistory($userId, $historyIds) {
        // Handle both single ID or array of IDs for multiple deletion
        if (!is_array($historyIds)) {
            $historyIds = [$historyIds];
        }

        $placeholders = implode(',', array_fill(0, count($historyIds), '?'));
        $stmt = $this->pdo->prepare("DELETE FROM history WHERE user_id = ? AND id IN ($placeholders)");

        $params = array_merge([$userId], $historyIds);
        return $stmt->execute($params);
    }

    public function deleteAllHistory($userId) {
        $stmt = $this->pdo->prepare("DELETE FROM history WHERE user_id = ?");
        return $stmt->execute([$userId]);
    }

}