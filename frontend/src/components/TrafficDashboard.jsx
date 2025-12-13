// frontend/src/components/TrafficDashboard.jsx
import React, { useEffect, useState } from "react";

export default function TrafficDashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/status");
        const json = await res.json();
        setData(json);
      } catch (e) {
        console.error("Status fetch failed", e);
      }
    };

    fetchStatus();
    const timer = setInterval(fetchStatus, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!data) return <div>Loading...</div>;

  return (
    <div style={{ padding: 16 }}>
      <h2>Smart Signal — Live</h2>

      <h4>
        Current Green: Lane {data.currentGreen + 1}  
        — Remaining: {data.timeRemaining}s
      </h4>

      <div style={{ display: "flex", gap: 15, flexWrap: "wrap" }}>
        {data.lanes.map((lane, i) => (
          <div key={i} style={{ border: "1px solid #ccc", padding: 12, width: 220 }}>
            <h3>Lane {i + 1}</h3>
            <div>Vehicles: {lane.count ?? 0}</div>
            <div>Green Time: {lane.green_time ?? 10}s</div>
            <div style={{ marginTop: 6, color: "#777" }}>
              Updated: {data.updatedAt}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
