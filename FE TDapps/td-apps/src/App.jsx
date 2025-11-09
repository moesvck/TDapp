// App.jsx
import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ListTD from './pages/ListTD';
import CreateEdit from './pages/CreateEdit';
import Login from './pages/Login';
import ListKPP from './pages/ListKPP';
import QRCode from './pages/QRcode';

// Protected Route Component dengan role-based access
const ProtectedRoute = ({ children, requiredRole }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Jika requiredRole ditentukan, cek role user
  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

// Public Route Component
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return !isAuthenticated ? children : <Navigate to="/" replace />;
};

// Component untuk halaman unauthorized
const Unauthorized = () => (
  <div className="d-flex justify-content-center align-items-center min-vh-100">
    <div className="text-center">
      <h1>403 - Unauthorized</h1>
      <p>You don't have permission to access this page.</p>
      <button className="btn btn-primary" onClick={() => window.history.back()}>
        Go Back
      </button>
    </div>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Public Routes */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />
            <Route path="/qrcode" element={<QRCode />} />
            <Route path="/unauthorized" element={<Unauthorized />} />

            {/* Protected Routes - Role-based */}

            {/* Route untuk user role */}
            <Route
              path="/listtd"
              element={
                <ProtectedRoute requiredRole="user">
                  <ListTD />
                </ProtectedRoute>
              }
            />

            {/* Route untuk staff role */}
            <Route
              path="/listkpp"
              element={
                <ProtectedRoute requiredRole="staff">
                  <ListKPP />
                </ProtectedRoute>
              }
            />

            {/* Hapus route admin karena tidak digunakan */}

            {/* Common routes yang bisa diakses multiple roles */}
            <Route
              path="/createedit"
              element={
                <ProtectedRoute>
                  <CreateEdit />
                </ProtectedRoute>
              }
            />
            <Route
              path="/createedit/:id?"
              element={
                <ProtectedRoute>
                  <CreateEdit />
                </ProtectedRoute>
              }
            />

            {/* Default route - redirect berdasarkan role */}
            <Route path="/" element={<NavigateToRoleBasedRoute />} />

            {/* Fallback Route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

// Component untuk redirect berdasarkan role user
const NavigateToRoleBasedRoute = () => {
  const { user } = useAuth();

  switch (user?.role) {
    case 'user':
      return <Navigate to="/listtd" replace />;
    case 'staff':
      return <Navigate to="/listkpp" replace />;
    case 'admin':
      // Jika ada user dengan role admin, redirect ke halaman yang sesuai
      // Misalnya ke listtd atau listkpp, atau tampilkan unauthorized
      return <Navigate to="/unauthorized" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
};

export default App;
