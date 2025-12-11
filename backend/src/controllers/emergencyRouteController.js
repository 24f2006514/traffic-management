const store = require('../db/dataStore');

exports.createEmergencyRoute = (req, res) => {
    const {
        source,
        destination,
        driverId,
        vehicleType,
        driverName,
        driverContact,
        vehicleNumber,
        emergencyType,
        priority,
        notes,
        status,
        routeInfo,
        emergencyDateTime
    } = req.body;

    if (!source || !destination) {
        return res.status(400).json({ error: 'Source and destination are required' });
    }

    const routeData = {
        source,
        destination,
        driverId: driverId || `driver-${Date.now()}`,
        vehicleType: vehicleType || 'ambulance',
        driverName: driverName || '',
        driverContact: driverContact || '',
        vehicleNumber: vehicleNumber || '',
        emergencyType: emergencyType || 'medical',
        priority: priority || 'high',
        notes: notes || '',
        status: status || 'dispatched',
        timestamp: new Date().toISOString(),
        emergencyDateTime: emergencyDateTime || new Date().toISOString(),
        routeInfo: routeInfo || null // Store route info if provided
    };

    const saved = store.saveEmergencyRoute(routeData);

    const io = req.app.get('io');
    if (io) io.emit('emergency_route', saved);

    return res.status(201).json(saved);
};

exports.getEmergencyRoutes = (req, res) => {
    const routes = store.getEmergencyRoutes();
    return res.status(200).json(routes);
};

exports.deleteEmergencyRoute = (req, res) => {
    const { id } = req.params;
    const deleted = store.deleteEmergencyRoute(parseInt(id));

    if (deleted) {
        const io = req.app.get('io');
        if (io) io.emit('emergency_route_deleted', { id: parseInt(id) });
        return res.status(200).json({ message: 'Route deleted successfully' });
    }

    return res.status(404).json({ error: 'Route not found' });
};

