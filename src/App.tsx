// ==========================================
// BhoomiAI - Application Router
// ==========================================

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth.store';
import { GOVERNMENT_ROLES } from './types/auth';

// Auth guards
import { ProtectedRoute, GovernmentRoute, CitizenRoute } from './components/auth';

// Layouts
import { AuthLayout } from './layouts/AuthLayout';
import { GovernmentLayout } from './layouts/GovernmentLayout';
import { CitizenLayout } from './layouts/CitizenLayout';

// Auth pages
import GovernmentLogin from './pages/auth/GovernmentLogin';
import MFAVerification from './pages/auth/MFAVerification';
import { CitizenLogin, CitizenRegister } from './pages/auth/CitizenAuth';

// Government pages
import Dashboard from './pages/government/Dashboard';
import DocumentUpload from './pages/government/DocumentUpload';
import ProcessingWorkspace from './pages/government/ProcessingWorkspace';
import GISMap from './pages/government/GISMap';
import { LandRecordsList, LandRecordDetail } from './pages/government/LandRecords';
import { VerificationQueue, VerificationDetail } from './pages/government/Verification';
import { Reports, AuditLogs, UserManagement, SettingsPage } from './pages/government/OtherPages';

// Citizen pages
import {
  CitizenHome,
  CitizenSearch,
  CitizenRecordView,
  CitizenApplications,
  CitizenApplicationDetail,
  CitizenCertificates,
} from './pages/citizen/CitizenPages';

// Demo switcher
import { DemoSwitcher } from './components/DemoSwitcher';

// Smart redirect based on auth state
const RootRedirect: React.FC = () => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated || !user) return <Navigate to="/citizen" replace />;
  if (GOVERNMENT_ROLES.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <Navigate to="/citizen" replace />;
};

// Redirect already-authenticated users away from login
const AuthRedirect: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user, mfaPending } = useAuthStore();
  if (isAuthenticated && user && !mfaPending) {
    if (GOVERNMENT_ROLES.includes(user.role)) return <Navigate to="/dashboard" replace />;
    return <Navigate to="/citizen" replace />;
  }
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <>
      <Routes>
        {/* Root redirect */}
        <Route path="/" element={<RootRedirect />} />

        {/* ==========================================
            Authentication Routes (AuthLayout)
            ========================================== */}
        <Route element={<AuthLayout />}>
          <Route
            path="/login"
            element={
              <AuthRedirect>
                <GovernmentLogin />
              </AuthRedirect>
            }
          />
          <Route path="/mfa" element={<MFAVerification />} />
        </Route>

        {/* Citizen auth — uses its own simple layout (no AuthLayout sidebar) */}
        <Route
          path="/citizen/login"
          element={
            <AuthRedirect>
              <CitizenLogin />
            </AuthRedirect>
          }
        />
        <Route
          path="/citizen/register"
          element={
            <AuthRedirect>
              <CitizenRegister />
            </AuthRedirect>
          }
        />

        {/* ==========================================
            Government Portal Routes
            ========================================== */}
        <Route
          element={
            <ProtectedRoute>
              <GovernmentRoute>
                <GovernmentLayout />
              </GovernmentRoute>
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/records" element={<LandRecordsList />} />
          <Route path="/records/:id" element={<LandRecordDetail />} />
          <Route path="/upload" element={<DocumentUpload />} />
          <Route path="/processing/:id" element={<ProcessingWorkspace />} />
          <Route path="/verification" element={<VerificationQueue />} />
          <Route path="/verification/:id" element={<VerificationDetail />} />
          <Route path="/gis" element={<GISMap />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/audit-logs" element={<AuditLogs />} />
          <Route path="/users" element={<UserManagement />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        {/* ==========================================
            Citizen Portal Routes
            ========================================== */}
        <Route
          element={
            <CitizenRoute>
              <CitizenLayout />
            </CitizenRoute>
          }
        >
          <Route path="/citizen" element={<CitizenHome />} />
          <Route path="/citizen/search" element={<CitizenSearch />} />
          <Route path="/citizen/records/:id" element={<CitizenRecordView />} />
          <Route path="/citizen/applications" element={<CitizenApplications />} />
          <Route path="/citizen/applications/:id" element={<CitizenApplicationDetail />} />
          <Route path="/citizen/certificates" element={<CitizenCertificates />} />
        </Route>

        {/* ==========================================
            Fallback — redirect unknown routes
            ========================================== */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Demo role switcher — visible in all views for SIH presentation */}
      <DemoSwitcher />
    </>
  );
};

export default App;
