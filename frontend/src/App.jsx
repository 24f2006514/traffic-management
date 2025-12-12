import { useState } from "react";
import { useAuth } from "./contexts/AuthContext";
import EmergencyForm from "./components/EmergencyForm";
import Login from "./components/Login";
import Register from "./components/Register";
import "./App.css";

function App() {
  const { isAuthenticated, user, logout, loading } = useAuth();
  const [showRegister, setShowRegister] = useState(false);
  const [userRole, setUserRole] = useState("driver");

  if (loading) {
    return (
      <div className="app-container">
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <h2>Loading...</h2>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return showRegister ? (
      <Register onSwitchToLogin={() => setShowRegister(false)} />
    ) : (
      <Login onSwitchToRegister={() => setShowRegister(true)} />
    );
  }

  // Determine role based on user role from database
  // Regular users (role='user') can only be drivers
  // Admins can only be officers
  const displayRole = user?.role === 'admin' ? 'officer' : 'driver';

  return (
    <div className="app-container">
      <div className="role-selector">
        <div className="header-top">
          <h1>Traffic Management System</h1>
          <div className="user-info">
            <span>Welcome, {user?.name} ({user?.role})</span>
            <button onClick={logout} className="logout-btn">
              Logout
            </button>
          </div>
        </div>
        <div className="role-badge">
          <span>
            {user?.role === 'admin' ? '👮 Officer Mode' : '🚑 Driver Mode'}
          </span>
        </div>
      </div>
      <EmergencyForm userRole={displayRole} />
    </div>
  );
}

export default App;
