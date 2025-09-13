import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './hooks/useAuth';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import RegistrationPage from './pages/RegistrationPage';
import InvigilatorPage from './pages/InvigilatorPage';
import EvaluatorPage from './pages/EvaluatorPage';
import AdminDashboard from './pages/admin/DashboardPage';
import AdminResults from './pages/admin/ResultsPage';
import AdminSettings from './pages/admin/SettingsPage';
import AdminUsers from './pages/admin/UsersPage';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            } />
            <Route path="/registration" element={
              <ProtectedRoute>
                <RegistrationPage />
              </ProtectedRoute>
            } />
            <Route path="/invigilator" element={
              <ProtectedRoute>
                <InvigilatorPage />
              </ProtectedRoute>
            } />
            <Route path="/evaluator" element={
              <ProtectedRoute>
                <EvaluatorPage />
              </ProtectedRoute>
            } />
            <Route path="/admin/dashboard" element={
              <ProtectedRoute requiredRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/results" element={
              <ProtectedRoute requiredRole="admin">
                <AdminResults />
              </ProtectedRoute>
            } />
            <Route path="/admin/settings" element={
              <ProtectedRoute requiredRole="admin">
                <AdminSettings />
              </ProtectedRoute>
            } />
            <Route path="/admin/users" element={
              <ProtectedRoute requiredRole="admin">
                <AdminUsers />
              </ProtectedRoute>
            } />
          </Routes>
          <Toaster position="top-right" />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;