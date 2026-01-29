import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from '@/components/layout';
import {
  DashboardPage,
  SearchPage,
  CandidatesPage,
  CandidateFormPage,
  RequirementsPage,
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
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    // Check for test user in localStorage
    const storedUser = localStorage.getItem('test-user');
    if (storedUser) {
      try {
        const user: User = JSON.parse(storedUser);
        useAuthStore.setState({
          user,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch {
        // Invalid stored user, clear it
        localStorage.removeItem('test-user');
        useAuthStore.setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    } else {
      useAuthStore.setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  }, []);

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
          <Route path="/candidates/:id" element={<CandidateFormPage />} />
          <Route path="/requirements" element={<RequirementsPage />} />
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
