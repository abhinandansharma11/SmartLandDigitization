// ==========================================
// BhoomiAI - Application Router
// ==========================================

import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import { useAuthStore } from './store/auth.store';
import { GOVERNMENT_ROLES } from './types/auth';

// Auth guards
import { ProtectedRoute, GovernmentRoute } from './components/auth';

// Layouts
import { AuthLayout } from './layouts/AuthLayout';
import { GovernmentLayout } from './layouts/GovernmentLayout';

// Auth pages
import GovernmentLogin from './pages/auth/GovernmentLogin';
import MFAVerification from './pages/auth/MFAVerification';

// Government pages
import Dashboard from './pages/government/Dashboard';
import DocumentUpload from './pages/government/DocumentUpload';
import ProcessingWorkspace from './pages/government/ProcessingWorkspace';
import GISMap from './pages/government/GISMap';
import { LandRecordsList, LandRecordDetail } from './pages/government/LandRecords';
import { VerificationQueue, VerificationDetail } from './pages/government/Verification';
import { Reports, AuditLogs, UserManagement, SettingsPage } from './pages/government/OtherPages';

// Public land-record portal
import {
  CitizenHome,
  CitizenSearch,
  CitizenRecordView,
  CitizenApplications,
  CitizenApplicationDetail,
  CitizenCertificates,
} from './pages/citizen/CitizenPages';
import { CitizenLayout } from './layouts/CitizenLayout';

// Redirect already-authenticated users away from login
const AuthRedirect: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user, mfaPending } = useAuthStore();
  if (isAuthenticated && user && !mfaPending) {
    if (GOVERNMENT_ROLES.includes(user.role)) return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

const App: React.FC = () => {
  const location = useLocation();

  return (
    <MotionConfig reducedMotion="user">
    <>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={location.pathname}
          className="route-transition"
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -8 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
      <Routes location={location}>
        {/* Public land-record portal */}
        <Route element={<CitizenLayout />}>
          <Route path="/" element={<CitizenHome />} />
          <Route path="/search" element={<CitizenSearch />} />
          <Route path="/land-record/:id" element={<CitizenRecordView />} />
          <Route path="/track-application" element={<CitizenApplications />} />
          <Route path="/track-application/:id" element={<CitizenApplicationDetail />} />
          <Route path="/certificates" element={<CitizenCertificates />} />
          <Route path="/map" element={<CitizenSearch />} />
        </Route>

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
            Fallback — redirect unknown routes
            ========================================== */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
        </motion.div>
      </AnimatePresence>

    </>
    </MotionConfig>
  );
};

export default App;
