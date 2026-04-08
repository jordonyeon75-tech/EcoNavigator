<?php
// api/get_ratings.php
require_once __DIR__ . '/../model/LocationModel.php';
$model = new LocationModel();

$locationId = intval($_GET['location_id']);
echo json_encode($model->getAverageRating($locationId));
