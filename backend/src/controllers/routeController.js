const https = require('https');
const { URL } = require('url');

/**
 * Proxy route to OSRM routing service to avoid CORS issues
 * GET /api/route?sourceLng=...&sourceLat=...&destLng=...&destLat=...
 */
// Calculate approximate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

exports.getRoute = (req, res) => {
    try {
        const { sourceLng, sourceLat, destLng, destLat } = req.query;

        if (!sourceLng || !sourceLat || !destLng || !destLat) {
            return res.status(400).json({ 
                error: 'Missing required parameters: sourceLng, sourceLat, destLng, destLat' 
            });
        }

        // Parse coordinates
        const sourceLatNum = parseFloat(sourceLat);
        const sourceLngNum = parseFloat(sourceLng);
        const destLatNum = parseFloat(destLat);
        const destLngNum = parseFloat(destLng);

        // Validate coordinates
        if (isNaN(sourceLatNum) || isNaN(sourceLngNum) || isNaN(destLatNum) || isNaN(destLngNum)) {
            return res.status(400).json({ 
                error: 'Invalid coordinates provided' 
            });
        }

        // Check if route is too long (OSRM public server has limits)
        const distance = calculateDistance(sourceLatNum, sourceLngNum, destLatNum, destLngNum);
        if (distance > 10000) { // More than 10,000 km
            return res.status(400).json({ 
                error: 'Route too long', 
                details: `The distance between points (${distance.toFixed(0)} km) exceeds the maximum supported distance. Please use closer locations.`
            });
        }

        const urlString = `https://router.project-osrm.org/route/v1/driving/${sourceLngNum},${sourceLatNum};${destLngNum},${destLatNum}?overview=full&geometries=geojson`;
        const url = new URL(urlString);

        const options = {
            hostname: url.hostname,
            path: url.pathname + url.search,
            method: 'GET',
            headers: {
                'User-Agent': 'TrafficManagement/1.0'
            }
        };

        // Add timeout to prevent hanging requests
        const request = https.get(options, (osrmRes) => {
            let data = '';

            // Read response data regardless of status code
            osrmRes.on('data', (chunk) => {
                data += chunk;
            });

            osrmRes.on('end', () => {
                // Check if the response is successful
                if (osrmRes.statusCode !== 200) {
                    console.error(`OSRM API returned status ${osrmRes.statusCode}`);
                    try {
                        // Try to parse error response
                        const errorData = data ? JSON.parse(data) : {};
                        let errorMessage = 'OSRM routing service is temporarily unavailable';
                        
                        if (osrmRes.statusCode === 502 || osrmRes.statusCode === 503) {
                            errorMessage = 'Routing service is temporarily unavailable. Please try again in a few moments or use locations closer together.';
                        } else if (osrmRes.statusCode === 504) {
                            errorMessage = 'Routing service timeout. The route may be too complex. Please try with locations closer together.';
                        } else if (errorData.message || errorData.error) {
                            errorMessage = errorData.message || errorData.error;
                        }
                        
                        return res.status(osrmRes.statusCode).json({ 
                            error: `Routing service returned error: ${osrmRes.statusCode}`,
                            details: errorMessage,
                            suggestion: 'Try again in a few moments or use locations that are closer together.'
                        });
                    } catch (parseError) {
                        return res.status(osrmRes.statusCode).json({ 
                            error: `Routing service returned error: ${osrmRes.statusCode}`,
                            details: 'Unable to parse error response. The routing service may be temporarily unavailable.',
                            suggestion: 'Please try again in a few moments.'
                        });
                    }
                }

                try {
                    const routeData = JSON.parse(data);
                    
                    // Check if OSRM returned an error (even with 200 status)
                    if (routeData.code && routeData.code !== 'Ok') {
                        console.error('OSRM route error:', routeData);
                        return res.status(400).json({ 
                            error: 'Route calculation failed', 
                            code: routeData.code,
                            message: routeData.message || 'Unable to calculate route'
                        });
                    }
                    
                    // Forward the OSRM response to the client
                    res.json(routeData);
                } catch (error) {
                    console.error('Error parsing OSRM response:', error);
                    console.error('Response data:', data.substring(0, 200));
                    res.status(500).json({ error: 'Failed to parse route data', details: error.message });
                }
            });
        });

        // Set timeout (30 seconds)
        request.setTimeout(30000, () => {
            request.destroy();
            console.error('OSRM request timeout');
            res.status(504).json({ 
                error: 'Request timeout', 
                details: 'Routing service took too long to respond. The route might be too complex or the service is overloaded.'
            });
        });

        request.on('error', (error) => {
            console.error('Error fetching route from OSRM:', error);
            res.status(500).json({ error: 'Failed to fetch route from routing service', details: error.message });
        });
    } catch (error) {
        console.error('Error in getRoute:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
};

