import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from '@/components/layout';
import {
  DashboardPage,
  SearchPage,
  CandidatesPage,
  CandidateProfilePage,
  CandidateFormPage,
  RequirementsPage,
  RequirementDetailPage,
  RequirementFormPage,
  InterviewsPage,
  ContractsPage,
  OrganisationPage,
  SettingsPage,
  LoginPage,
} from '@/pages';
import { useAuthStore } from '@/lib/stores/auth-store';
import { LoadingOverlay } from '@/components/ui';
import type { User } from '@/types';

function App() {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();

  useEffect(() => {
    // Check for existing Supabase session
    checkAuth();
  }, [checkAuth]);

  if (isLoading) {
    return <LoadingOverlay />;
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={
            isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />
          }
        />

        {/* Protected routes */}
        <Route
          element={
            isAuthenticated ? <Layout /> : <Navigate to="/login" replace />
          }
        >
          <Route path="/" element={<DashboardPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/candidates" element={<CandidatesPage />} />
          <Route path="/candidates/new" element={<CandidateFormPage />} />
          <Route path="/candidates/:id" element={<CandidateProfilePage />} />
          <Route path="/candidates/:id/edit" element={<CandidateFormPage />} />
          <Route path="/requirements" element={<RequirementsPage />} />
          <Route path="/requirements/new" element={<RequirementFormPage />} />
          <Route path="/requirements/:id" element={<RequirementDetailPage />} />
          <Route path="/requirements/:id/edit" element={<RequirementFormPage />} />
          <Route path="/interviews" element={<InterviewsPage />} />
          <Route path="/contracts" element={<ContractsPage />} />
          <Route path="/organisation" element={<OrganisationPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        {/* Auth callback route */}
        <Route
          path="/auth/callback"
          element={<AuthCallback />}
        />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

// Auth callback handler for OAuth
function AuthCallback() {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return <LoadingOverlay />;
}

export default App;
