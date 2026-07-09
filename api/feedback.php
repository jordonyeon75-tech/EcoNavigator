<?php
// api/feedback.php
require_once __DIR__ . '/../model/LocationModel.php';
$model = new LocationModel();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $locationId = intval($_GET['location_id']);
    echo json_encode($model->getFeedback($locationId));
    exit;
}

session_start();
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success'=>false,'error'=>'Login required']);
    exit;
}

$userId = $_SESSION['user_id'];
$locationId = intval($_POST['location_id']);
$feedback = trim($_POST['feedback']);

$success = $model->addFeedback($userId, $locationId, $feedback);
echo json_encode(['success'=>$success]);
