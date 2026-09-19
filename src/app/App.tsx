import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../components/layout/ThemeContext.tsx';
import { AppShell } from '../components/layout/AppShell.tsx';
import { storage } from '../lib/storage.ts';
import { AuthProvider } from '../contexts/AuthContext.tsx';
import { AuthGuard } from '../features/auth/AuthGuard.tsx';
import { AuthPage } from '../features/auth/AuthPage.tsx';

// Feature Pages
import { OnboardingFlow } from '../features/onboarding/OnboardingFlow.tsx';
import { TodayPage } from '../features/dashboard/TodayPage.tsx';
import { PlannerPage } from '../features/planner/PlannerPage.tsx';
import { AssignmentsPage } from '../features/assignments/AssignmentsPage.tsx';
import { ReviewPage } from '../features/reviews/ReviewPage.tsx';
import { AnalyticsPage } from '../features/analytics/AnalyticsPage.tsx';
import { RulesPage } from '../features/rules/RulesPage.tsx';
import { SettingsPage } from '../features/settings/SettingsPage.tsx';
import { WorkSessionView } from '../features/sessions/WorkSessionView.tsx';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

/**
 * OnboardingGuard checks if the user has completed the onboarding flow.
 * If incomplete, redirects immediately to /onboarding.
 */
const OnboardingGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [completed, setCompleted] = useState<boolean>(() => storage.isOnboardingCompleted());

  useEffect(() => {
    return storage.subscribe(() => {
      setCompleted(storage.isOnboardingCompleted());
    });
  }, []);

  if (!completed) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              {/* Public Authentication Route */}
              <Route path="/login" element={<AuthPage />} />

              {/* Dedicated distraction-free Onboarding route */}
              <Route
                path="/onboarding"
                element={
                  <AuthGuard>
                    <OnboardingFlow />
                  </AuthGuard>
                }
              />

              {/* Dedicated distraction-free Active Focus Session route */}
              <Route
                path="/session"
                element={
                  <AuthGuard>
                    <OnboardingGuard>
                      <WorkSessionView />
                    </OnboardingGuard>
                  </AuthGuard>
                }
              />

              {/* Protected Application Shell routes */}
              <Route
                element={
                  <AuthGuard>
                    <OnboardingGuard>
                      <AppShell />
                    </OnboardingGuard>
                  </AuthGuard>
                }
              >
                <Route path="/" element={<Navigate to="/today" replace />} />
                <Route path="/today" element={<TodayPage />} />
                <Route path="/planner" element={<PlannerPage />} />
                <Route path="/assignments" element={<AssignmentsPage />} />
                <Route path="/review" element={<ReviewPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/rules" element={<RulesPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/today" replace />} />
              </Route>
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
