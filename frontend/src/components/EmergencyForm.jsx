import { useState, useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  Polyline,
} from "react-leaflet";
import { io } from "socket.io-client";
import {
  AlertCircle,
  Navigation,
  Clock,
  MapPin,
  User,
  Phone,
  Ambulance,
  Send,
  CheckCircle,
  Trash2,
  Calendar,
} from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./EmergencyForm.css";

const API_BASE_URL = "http://localhost:3000";
const SOCKET_URL = "http://localhost:3000";

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Component to update map center without remounting
function MapCenterUpdater({ center }) {
  const map = useMap();

  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, map.getZoom());
    }
  }, [map, center]);

  return null;
}

// Component to handle routing using OSRM API - FIXED VERSION
function Routing({
  source,
  destination,
  onRouteCalculated,
  color = "#ff0000",
  emergencyId = null,
}) {
  const map = useMap();
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const hasFittedBounds = useRef(false);

  useEffect(() => {
    if (
      !source ||
      !destination ||
      !source.lat ||
      !source.lng ||
      !destination.lat ||
      !destination.lng
    ) {
      setRouteCoordinates([]);
      hasFittedBounds.current = false;
      return;
    }

    // Reset fit bounds flag when source/destination changes
    hasFittedBounds.current = false;

    // Fetch route from OSRM
    const fetchRoute = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${source.lng},${source.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.code === "Ok" && data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const coordinates = route.geometry.coordinates.map((coord) => [
            coord[1],
            coord[0],
          ]); // Convert [lng, lat] to [lat, lng]
          setRouteCoordinates(coordinates);

          // Calculate distance and time
          const distance = route.distance / 1000; // Convert to km
          const time = route.duration / 60; // Convert to minutes

          // Estimate ambulance time (assuming 1.5x faster than normal due to emergency clearance)
          const ambulanceTime = time / 1.5;

          const routeData = {
            distance: distance.toFixed(2),
            normalTime: time.toFixed(1),
            ambulanceTime: ambulanceTime.toFixed(1),
          };

          // If callback provided, call it with route info and emergencyId
          if (onRouteCalculated) {
            onRouteCalculated(routeData, emergencyId);

            // Fit map to route bounds with safety checks
            if (coordinates.length > 0 && !hasFittedBounds.current) {
              // Use setTimeout to ensure map is fully rendered
              setTimeout(() => {
                try {
                  // Check if map and map container exist and are initialized
                  if (map && map._loaded && map.getContainer()) {
                    const bounds = L.latLngBounds(coordinates);
                    map.fitBounds(bounds, {
                      padding: [50, 50],
                      animate: false, // Disable animation to prevent errors during multiple updates
                    });
                    hasFittedBounds.current = true;
                  }
                } catch (err) {
                  console.warn("Could not fit bounds:", err);
                  // Non-critical error, map will still display route
                }
              }, 100);
            }
          }
        } else {
          console.error("OSRM route error:", data);
          setRouteCoordinates([]);
        }
      } catch (error) {
        console.error("Error fetching route:", error);
        setRouteCoordinates([]);
        if (onRouteCalculated) {
          // Only show alert for user-initiated routes, not background officer routes
          console.warn("Failed to calculate route");
        }
      }
    };

    fetchRoute();
  }, [map, source, destination, onRouteCalculated, color, emergencyId]);

  return routeCoordinates.length > 0 ? (
    <Polyline
      positions={routeCoordinates}
      color={color}
      weight={6}
      opacity={0.8}
    />
  ) : null;
}

// Component to display all emergency routes for officers
function AllEmergencyRoutes({
  routes,
  onSelect,
  selectedId,
  onRouteCalculated,
}) {
  return (
    <>
      {routes.map((route, index) => {
        if (!route.source?.coords || !route.destination?.coords) return null;

        const colors = ["#ff0000", "#0066ff", "#00ff00", "#ff00ff", "#ffff00"];
        const color = colors[index % colors.length];

        return (
          <div key={route.id || index}>
            <Marker
              position={[route.source.coords.lat, route.source.coords.lng]}
            >
              <Popup>
                <strong>Source - Route {index + 1}</strong>
                <br />
                {route.source.address || route.source.coords.displayName}
                <br />
                <small>Vehicle: {route.vehicleNumber || route.driverId}</small>
                <br />
                <small>
                  <Calendar size={12} />{" "}
                  {formatFullDateTime(
                    route.emergencyDateTime || route.timestamp
                  )}
                </small>
              </Popup>
            </Marker>
            <Marker
              position={[
                route.destination.coords.lat,
                route.destination.coords.lng,
              ]}
            >
              <Popup>
                <strong>Destination - Route {index + 1}</strong>
                <br />
                {route.destination.address ||
                  route.destination.coords.displayName}
                <br />
                <small>Vehicle: {route.vehicleNumber || route.driverId}</small>
                <br />
                <small>
                  <Calendar size={12} />{" "}
                  {formatFullDateTime(
                    route.emergencyDateTime || route.timestamp
                  )}
                </small>
              </Popup>
            </Marker>
            <Routing
              source={route.source.coords}
              destination={route.destination.coords}
              color={selectedId === route.id ? "#fbbf24" : color}
              onRouteCalculated={onRouteCalculated}
              emergencyId={route.id}
            />
          </div>
        );
      })}
    </>
  );
}

// Helper function to format date and time
const formatDateTime = (dateString) => {
  if (!dateString) return "Just now";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;

  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatFullDateTime = (dateString) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

function EmergencyForm({ userRole = "driver" }) {
  const [formData, setFormData] = useState({
    vehicleType: "ambulance",
    driverName: "",
    driverContact: "",
    vehicleNumber: "",
    origin: "",
    destination: "",
    originLat: "",
    originLng: "",
    destLat: "",
    destLng: "",
    emergencyType: "medical",
    priority: "high",
    notes: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [sourceCoords, setSourceCoords] = useState(null);
  const [destinationCoords, setDestinationCoords] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [emergencyRouteInfos, setEmergencyRouteInfos] = useState({});
  const [mapCenter, setMapCenter] = useState([9.9312, 76.2673]); // Default: Kochi, Kerala
  const [loading, setLoading] = useState(false);
  const [emergencyRoutes, setEmergencyRoutes] = useState([]);
  const [selectedEmergency, setSelectedEmergency] = useState(null);
  const socketRef = useRef(null);

  // Fetch emergency routes from backend
  const fetchEmergencyRoutes = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/emergency-routes`);
      if (response.ok) {
        const routes = await response.json();
        setEmergencyRoutes(routes);
      }
    } catch (error) {
      console.error("Error fetching emergency routes:", error);
    }
  };

  // Initialize WebSocket connection
  useEffect(() => {
    socketRef.current = io(SOCKET_URL);

    // Listen for new emergency routes (for officers)
    socketRef.current.on("emergency_route", (routeData) => {
      if (userRole === "officer") {
        setEmergencyRoutes((prev) => {
          // Avoid duplicates
          if (prev.find((r) => r.id === routeData.id)) return prev;
          return [...prev, routeData];
        });
      }
    });

    // Listen for deleted routes
    socketRef.current.on("emergency_route_deleted", ({ id }) => {
      setEmergencyRoutes((prev) => prev.filter((r) => r.id !== id));
    });

    // Fetch existing routes for officers
    if (userRole === "officer") {
      fetchEmergencyRoutes();
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [userRole]);

  // Geocode address to coordinates
  const geocodeAddress = async (address) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          address
        )}&limit=1`
      );
      const data = await response.json();
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          displayName: data[0].display_name,
        };
      }
      return null;
    } catch (error) {
      console.error("Geocoding error:", error);
      return null;
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setRouteInfo(null);

    try {
      // Geocode source and destination
      const source = await geocodeAddress(formData.origin);
      const destination = await geocodeAddress(formData.destination);

      if (!source || !destination) {
        alert(
          "Could not find one or both locations. Please check the addresses."
        );
        setLoading(false);
        return;
      }

      setSourceCoords(source);
      setDestinationCoords(destination);

      // Update form data with coordinates
      setFormData((prev) => ({
        ...prev,
        originLat: source.lat.toFixed(6),
        originLng: source.lng.toFixed(6),
        destLat: destination.lat.toFixed(6),
        destLng: destination.lng.toFixed(6),
      }));

      // Center map on midpoint
      const midLat = (source.lat + destination.lat) / 2;
      const midLng = (source.lng + destination.lng) / 2;
      setMapCenter([midLat, midLng]);

      // If user is a driver, send the route to backend
      if (userRole === "driver") {
        const routeData = {
          vehicleType: formData.vehicleType,
          driverName: formData.driverName,
          driverContact: formData.driverContact,
          vehicleNumber: formData.vehicleNumber,
          source: {
            address: formData.origin,
            coords: source,
          },
          destination: {
            address: formData.destination,
            coords: destination,
          },
          emergencyType: formData.emergencyType,
          priority: formData.priority,
          notes: formData.notes,
          driverId: `driver-${Date.now()}`,
          status: "dispatched",
          timestamp: new Date().toISOString(),
          emergencyDateTime: new Date().toISOString(),
        };

        try {
          const response = await fetch(`${API_BASE_URL}/emergency-routes`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(routeData),
          });

          if (!response.ok) {
            throw new Error("Failed to save emergency route");
          }

          const savedRoute = await response.json();
          setEmergencyRoutes((prev) => [savedRoute, ...prev]);
          setSubmitted(true);

          setTimeout(() => {
            setSubmitted(false);
            setFormData({
              vehicleType: "ambulance",
              driverName: "",
              driverContact: "",
              vehicleNumber: "",
              origin: "",
              destination: "",
              originLat: "",
              originLng: "",
              destLat: "",
              destLng: "",
              emergencyType: "medical",
              priority: "high",
              notes: "",
            });
            setSourceCoords(null);
            setDestinationCoords(null);
            setRouteInfo(null);
          }, 3000);
        } catch (error) {
          console.error("Error saving emergency route:", error);
          alert("Route calculated but failed to save. Please try again.");
        }
      }
    } catch (error) {
      console.error("Error processing route:", error);
      alert("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRouteCalculated = (info) => {
    setRouteInfo(info);
  };

  const handleEmergencyRouteCalculated = (info, emergencyId) => {
    if (emergencyId) {
      setEmergencyRouteInfos((prev) => ({
        ...prev,
        [emergencyId]: info,
      }));
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const viewEmergencyOnMap = (emergency) => {
    setSelectedEmergency(emergency);
    if (emergency.source?.coords && emergency.destination?.coords) {
      const midLat =
        (emergency.source.coords.lat + emergency.destination.coords.lat) / 2;
      const midLng =
        (emergency.source.coords.lng + emergency.destination.coords.lng) / 2;
      setMapCenter([midLat, midLng]);
    }
  };

  const clearEmergency = async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/emergency-routes/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setEmergencyRoutes((prev) => prev.filter((e) => e.id !== id));
        if (selectedEmergency?.id === id) {
          setSelectedEmergency(null);
        }
      }
    } catch (error) {
      console.error("Error deleting emergency:", error);
      // Fallback: remove from local state
      setEmergencyRoutes((prev) => prev.filter((e) => e.id !== id));
      if (selectedEmergency?.id === id) {
        setSelectedEmergency(null);
      }
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "critical":
        return "priority-critical";
      case "high":
        return "priority-high";
      case "medium":
        return "priority-medium";
      default:
        return "priority-low";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "in-transit":
        return "status-in-transit";
      case "dispatched":
        return "status-dispatched";
      case "arrived":
        return "status-arrived";
      default:
        return "status-default";
    }
  };

  const getVehicleIconColor = (vehicleType) => {
    switch (vehicleType) {
      case "ambulance":
        return "vehicle-ambulance";
      case "fire":
        return "vehicle-fire";
      case "police":
        return "vehicle-police";
      default:
        return "vehicle-default";
    }
  };

  return (
    <div className="emergency-form-wrapper">
      <div className="emergency-form-container">
        <div className="emergency-form-header">
          <div className="header-left">
            <div className="header-icon">
              <Ambulance size={32} />
            </div>
            <div>
              <h1>Emergency Route Clearance</h1>
              <p>Real-time traffic management for emergency vehicles</p>
            </div>
          </div>
        </div>

        <div className="emergency-grid">
          {userRole === "driver" && (
            <div className="form-section">
              <div className="section-header">
                <AlertCircle className="section-icon" />
                <h2>Submit Emergency Request</h2>
              </div>

              {submitted ? (
                <div className="submission-success">
                  <CheckCircle size={64} />
                  <h3>Request Submitted!</h3>
                  <p>
                    Route clearance is being processed. Officers have been
                    notified.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="emergency-form">
                  <div className="form-row">
                    <label>Vehicle Type *</label>
                    <div className="vehicle-type-buttons">
                      {["ambulance", "fire", "police"].map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              vehicleType: type,
                            }))
                          }
                          className={`vehicle-type-btn ${
                            formData.vehicleType === type ? "active" : ""
                          }`}
                        >
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="form-row grid-2">
                    <div>
                      <label>
                        <User size={16} />
                        Driver Name *
                      </label>
                      <input
                        type="text"
                        name="driverName"
                        value={formData.driverName}
                        onChange={handleInputChange}
                        required
                        placeholder="Enter driver name"
                      />
                    </div>
                    <div>
                      <label>
                        <Phone size={16} />
                        Contact Number *
                      </label>
                      <input
                        type="tel"
                        name="driverContact"
                        value={formData.driverContact}
                        onChange={handleInputChange}
                        required
                        placeholder="+91 98765 43210"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <label>Vehicle Number *</label>
                    <input
                      type="text"
                      name="vehicleNumber"
                      value={formData.vehicleNumber}
                      onChange={handleInputChange}
                      required
                      placeholder="KL-01-AB-1234"
                    />
                  </div>

                  <div className="form-row grid-2">
                    <div>
                      <label>
                        <MapPin size={16} />
                        Origin (From) *
                      </label>
                      <input
                        type="text"
                        name="origin"
                        value={formData.origin}
                        onChange={handleInputChange}
                        required
                        placeholder="Starting location"
                      />
                      <div className="coord-inputs">
                        <input
                          type="text"
                          name="originLat"
                          value={formData.originLat}
                          onChange={handleInputChange}
                          placeholder="Latitude"
                          readOnly
                        />
                        <input
                          type="text"
                          name="originLng"
                          value={formData.originLng}
                          onChange={handleInputChange}
                          placeholder="Longitude"
                          readOnly
                        />
                      </div>
                    </div>
                    <div>
                      <label>
                        <Navigation size={16} />
                        Destination (To) *
                      </label>
                      <input
                        type="text"
                        name="destination"
                        value={formData.destination}
                        onChange={handleInputChange}
                        required
                        placeholder="Destination location"
                      />
                      <div className="coord-inputs">
                        <input
                          type="text"
                          name="destLat"
                          value={formData.destLat}
                          onChange={handleInputChange}
                          placeholder="Latitude"
                          readOnly
                        />
                        <input
                          type="text"
                          name="destLng"
                          value={formData.destLng}
                          onChange={handleInputChange}
                          placeholder="Longitude"
                          readOnly
                        />
                      </div>
                    </div>
                  </div>

                  <div className="form-row grid-2">
                    <div>
                      <label>Emergency Type *</label>
                      <select
                        name="emergencyType"
                        value={formData.emergencyType}
                        onChange={handleInputChange}
                      >
                        <option value="medical">Medical Emergency</option>
                        <option value="fire">Fire</option>
                        <option value="accident">Accident</option>
                        <option value="crime">Crime</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label>Priority Level *</label>
                      <select
                        name="priority"
                        value={formData.priority}
                        onChange={handleInputChange}
                      >
                        <option value="critical">Critical</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <label>Additional Notes</label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      rows={3}
                      placeholder="Any additional information..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="submit-btn"
                  >
                    <Send size={20} />
                    {loading
                      ? "Calculating Route..."
                      : "Submit Emergency Request"}
                  </button>
                </form>
              )}

              {routeInfo && (
                <div className="route-info">
                  <h3>Route Information</h3>
                  <div className="route-stats">
                    <div className="stat-item">
                      <span className="stat-label">Distance:</span>
                      <span className="stat-value">
                        {routeInfo.distance} km
                      </span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Normal Time:</span>
                      <span className="stat-value">
                        {routeInfo.normalTime} min
                      </span>
                    </div>
                    <div className="stat-item highlight">
                      <span className="stat-label">🚑 Ambulance Time:</span>
                      <span className="stat-value">
                        {routeInfo.ambulanceTime} min
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div
            className={`active-emergencies-section ${
              userRole === "officer" ? "full-width" : ""
            }`}
          >
            <div className="section-header">
              <Clock className="section-icon" />
              <h2>Active Emergencies</h2>
              <span className="active-count">
                {emergencyRoutes.length} Active
              </span>
            </div>

            <div className="emergencies-list">
              {emergencyRoutes.length === 0 ? (
                <div className="empty-state">
                  <Ambulance size={48} />
                  <p>No active emergencies at the moment</p>
                </div>
              ) : (
                emergencyRoutes.map((emergency) => (
                  <div
                    key={emergency.id}
                    className={`emergency-card ${
                      selectedEmergency?.id === emergency.id ? "selected" : ""
                    }`}
                  >
                    <div className="emergency-card-header">
                      <div className="emergency-card-left">
                        <div
                          className={`vehicle-icon ${getVehicleIconColor(
                            emergency.vehicleType || "ambulance"
                          )}`}
                        >
                          <Ambulance size={20} />
                        </div>
                        <div>
                          <h3>
                            {emergency.vehicleNumber ||
                              emergency.driverId ||
                              "Unknown"}
                          </h3>
                          <p>{emergency.driverName || "Driver"}</p>
                        </div>
                      </div>
                      <div className="emergency-badges">
                        <span
                          className={`priority-badge ${getPriorityColor(
                            emergency.priority || "high"
                          )}`}
                        >
                          {(emergency.priority || "high").toUpperCase()}
                        </span>
                        <span
                          className={`status-badge ${getStatusColor(
                            emergency.status || "dispatched"
                          )}`}
                        >
                          {emergency.status || "dispatched"}
                        </span>
                      </div>
                    </div>

                    <div className="emergency-card-body">
                      <div className="emergency-locations">
                        <div>
                          <MapPin size={16} className="icon-green" />
                          <span className="label">From:</span>
                          <span>{emergency.source?.address || "Unknown"}</span>
                        </div>
                        <div>
                          <Navigation size={16} className="icon-red" />
                          <span className="label">To:</span>
                          <span>
                            {emergency.destination?.address || "Unknown"}
                          </span>
                        </div>
                      </div>

                      <div className="emergency-details">
                        <div className="emergency-date-info">
                          <Calendar size={16} />
                          <div>
                            <div className="date-label">
                              Emergency Date & Time:
                            </div>
                            <div className="date-value">
                              {formatFullDateTime(
                                emergency.emergencyDateTime ||
                                  emergency.timestamp
                              )}
                            </div>
                            <div className="date-relative">
                              {formatDateTime(
                                emergency.emergencyDateTime ||
                                  emergency.timestamp
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="emergency-eta">
                          <Clock size={16} />
                          <div>
                            <div className="date-label">Estimated Arrival:</div>
                            <div className="date-value">
                              <strong>
                                {emergencyRouteInfos[emergency.id]
                                  ?.ambulanceTime || "Calculating..."}{" "}
                                min
                              </strong>
                            </div>
                          </div>
                        </div>
                      </div>

                      {userRole === "officer" && (
                        <div className="emergency-actions">
                          <button
                            onClick={() => viewEmergencyOnMap(emergency)}
                            className="view-map-btn"
                          >
                            View on Map
                          </button>
                          <button
                            onClick={() => clearEmergency(emergency.id)}
                            className="delete-btn"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {userRole === "officer" && (
            <div className="map-section full-width">
              <div className="section-header">
                <h2>Live Route Map</h2>
                {selectedEmergency && (
                  <div className="selected-route-info">
                    <span>Viewing:</span>
                    <span className="selected-badge">
                      {selectedEmergency.vehicleNumber ||
                        selectedEmergency.driverId}
                    </span>
                  </div>
                )}
              </div>
              <div className="map-container">
                <MapContainer
                  center={mapCenter}
                  zoom={13}
                  style={{ height: "500px", width: "100%" }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  <MapCenterUpdater center={mapCenter} />

                  {sourceCoords && sourceCoords.lat && sourceCoords.lng && (
                    <Marker position={[sourceCoords.lat, sourceCoords.lng]}>
                      <Popup>
                        <strong>Source</strong>
                        <br />
                        {sourceCoords.displayName}
                      </Popup>
                    </Marker>
                  )}

                  {destinationCoords &&
                    destinationCoords.lat &&
                    destinationCoords.lng && (
                      <Marker
                        position={[
                          destinationCoords.lat,
                          destinationCoords.lng,
                        ]}
                      >
                        <Popup>
                          <strong>Destination</strong>
                          <br />
                          {destinationCoords.displayName}
                        </Popup>
                      </Marker>
                    )}

                  {sourceCoords &&
                    destinationCoords &&
                    sourceCoords.lat &&
                    sourceCoords.lng &&
                    destinationCoords.lat &&
                    destinationCoords.lng && (
                      <Routing
                        source={sourceCoords}
                        destination={destinationCoords}
                        onRouteCalculated={handleRouteCalculated}
                        color="#ff0000"
                      />
                    )}

                  {/* Show all emergency routes for officers */}
                  {userRole === "officer" && emergencyRoutes.length > 0 && (
                    <AllEmergencyRoutes
                      routes={emergencyRoutes}
                      onSelect={viewEmergencyOnMap}
                      selectedId={selectedEmergency?.id}
                      onRouteCalculated={handleEmergencyRouteCalculated}
                    />
                  )}
                </MapContainer>
              </div>
              <div className="map-legend">
                <div className="legend-item">
                  <div className="legend-dot green"></div>
                  <span>Origin</span>
                </div>
                <div className="legend-item">
                  <div className="legend-dot red"></div>
                  <span>Destination</span>
                </div>
                <div className="legend-item">
                  <div className="legend-line"></div>
                  <span>Route</span>
                </div>
              </div>
            </div>
          )}

          {userRole === "driver" && (
            <div className="map-section">
              <div className="section-header">
                <h2>Route Map</h2>
              </div>
              <div className="map-container">
                <MapContainer
                  center={mapCenter}
                  zoom={13}
                  style={{ height: "500px", width: "100%" }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  <MapCenterUpdater center={mapCenter} />

                  {sourceCoords && sourceCoords.lat && sourceCoords.lng && (
                    <Marker position={[sourceCoords.lat, sourceCoords.lng]}>
                      <Popup>
                        <strong>Source</strong>
                        <br />
                        {sourceCoords.displayName}
                        <br />
                        <small>
                          <Calendar size={12} />{" "}
                          {formatFullDateTime(new Date().toISOString())}
                        </small>
                      </Popup>
                    </Marker>
                  )}

                  {destinationCoords &&
                    destinationCoords.lat &&
                    destinationCoords.lng && (
                      <Marker
                        position={[
                          destinationCoords.lat,
                          destinationCoords.lng,
                        ]}
                      >
                        <Popup>
                          <strong>Destination</strong>
                          <br />
                          {destinationCoords.displayName}
                          <br />
                          <small>
                            <Calendar size={12} />{" "}
                            {formatFullDateTime(new Date().toISOString())}
                          </small>
                        </Popup>
                      </Marker>
                    )}

                  {sourceCoords &&
                    destinationCoords &&
                    sourceCoords.lat &&
                    sourceCoords.lng &&
                    destinationCoords.lat &&
                    destinationCoords.lng && (
                      <Routing
                        source={sourceCoords}
                        destination={destinationCoords}
                        onRouteCalculated={handleRouteCalculated}
                        color="#ff0000"
                      />
                    )}
                </MapContainer>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default EmergencyForm;
