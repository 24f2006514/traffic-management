import { useState } from "react";
import EmergencyForm from "./components/EmergencyForm";
import "./App.css";

function App() {
  const [userRole, setUserRole] = useState("driver");

  return (
    <div className="app-container">
      <div className="role-selector">
        <h1>Traffic Management System</h1>
        <div className="role-buttons">
          <button
            onClick={() => setUserRole("driver")}
            className={userRole === "driver" ? "active" : ""}
          >
            🚑 Driver Mode
          </button>
          <button
            onClick={() => setUserRole("officer")}
            className={userRole === "officer" ? "active" : ""}
          >
            👮 Officer Mode
          </button>
        </div>
      </div>
      <EmergencyForm userRole={userRole} />
    </div>
  );
}

export default App;
