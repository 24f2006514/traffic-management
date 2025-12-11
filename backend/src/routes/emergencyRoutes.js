const express = require('express');
const router = express.Router();
const emergencyRouteController = require('../controllers/emergencyRouteController');

router.post('/', emergencyRouteController.createEmergencyRoute);
router.get('/', emergencyRouteController.getEmergencyRoutes);
router.delete('/:id', emergencyRouteController.deleteEmergencyRoute);

module.exports = router;

