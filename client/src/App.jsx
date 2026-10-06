import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';

import Login from './pages/Login';
import Register from './pages/Register';
import ResidentDashboard from './pages/resident/ResidentDashboard';
import AssessActivities from './pages/resident/AssessActivities';
import MyRecommendations from './pages/resident/MyRecommendations';
import EmployeeDashboard from './pages/employee/EmployeeDashboard';
import ResidentsList from './pages/employee/ResidentsList';
import ResidentProfile from './pages/employee/ResidentProfile';
import AllRecommendations from './pages/employee/AllRecommendations';

function AppRoutes() {
  const { user } = useAuth();
  return (
    <>
      {user && <Navbar />}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Resident routes */}
        <Route path="/resident/dashboard" element={<ProtectedRoute role="resident"><ResidentDashboard /></ProtectedRoute>} />
        <Route path="/resident/assess" element={<ProtectedRoute role="resident"><AssessActivities /></ProtectedRoute>} />
        <Route path="/resident/recommendations" element={<ProtectedRoute role="resident"><MyRecommendations /></ProtectedRoute>} />

        {/* Employee routes */}
        <Route path="/employee/dashboard" element={<ProtectedRoute role="employee"><EmployeeDashboard /></ProtectedRoute>} />
        <Route path="/employee/residents" element={<ProtectedRoute role="employee"><ResidentsList /></ProtectedRoute>} />
        <Route path="/employee/residents/:id" element={<ProtectedRoute role="employee"><ResidentProfile /></ProtectedRoute>} />
        <Route path="/employee/recommendations" element={<ProtectedRoute role="employee"><AllRecommendations /></ProtectedRoute>} />

        {/* Default redirect */}
        <Route path="/" element={
          user
            ? <Navigate to={user.role === 'resident' ? '/resident/dashboard' : '/employee/dashboard'} replace />
            : <Navigate to="/login" replace />
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
