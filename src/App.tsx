import React, { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect, useRef } from "react";
import { MobileSearchProvider } from "@/contexts/MobileSearchContext";
import { supabase } from "@/integrations/supabase/client";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { installGlobalErrorHandlers } from "@/lib/error-capture";
import { installSessionGuard } from "@/lib/session-guard";
import { initAuthListener, useAuthState } from "@/hooks/use-auth-state";
import { AppProvider } from "@/contexts/AppContext";
import { TourModeProvider, useTourMode } from "@/contexts/TourModeContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { RouteTransitionProvider } from "@/contexts/RouteTransitionContext";
import { BillingStatusBanner, ExpiredBlocker } from "@/components/subscription";
import { PageLoader } from "@/components/PageLoader";
import { ScrollRestoration } from "@/components/ScrollRestoration";
import { FeatureGatedRoute } from "@/components/feature-locks/FeatureGatedRoute";
import { useLoginPrefetch } from "@/hooks/use-navigation-prefetch";
import { SuperAdminRoute } from "@/components/admin/SuperAdminRoute";
import { GuidanceProvider } from "@/contexts/GuidanceContext";
import { isEmailVerified, setPendingVerificationEmail } from "@/lib/email-verification";

// Lazy: route-transition + post-login-only widgets. Keeps unauth landing/auth pages lean.
const RouteTransitionLoader = lazy(() =>
  import("@/components/RouteTransitionLoader").then(m => ({ default: m.RouteTransitionLoader }))
);
const AnnouncementBanner = lazy(() =>
  import("@/components/AnnouncementBanner").then(m => ({ default: m.AnnouncementBanner }))
);
const GlobalFrictionDetector = lazy(() =>
  import("@/components/friction/GlobalFrictionDetector").then(m => ({ default: m.GlobalFrictionDetector }))
);
const SessionTimeoutManager = lazy(() =>
  import("@/components/auth/SessionTimeoutManager").then(m => ({ default: m.SessionTimeoutManager }))
);
const TourEngine = lazy(() =>
  import("@/components/tour-v2/TourEngine").then(m => ({ default: m.TourEngine }))
);

// Lazy load all page components
const Index = lazy(() => import("./pages/Index"));
const Inventory = lazy(() => import("./pages/Inventory"));
const ImportLoadPlan = lazy(() => import("./pages/ImportLoadPlan"));
const AddEquipment = lazy(() => import("./pages/AddEquipment"));
const People = lazy(() => import("./pages/People"));
const Calendar = lazy(() => import("./pages/Calendar"));
const Settings = lazy(() => import("./pages/Settings"));
const PalletBuilder = lazy(() => import("./pages/PalletBuilder"));
const TrailerBuilder = lazy(() => import("./pages/TrailerBuilder"));
const LayoutPlanner = lazy(() => import("./pages/LayoutPlanner"));
const Auth = lazy(() => import("./pages/Auth"));
const NotFound = lazy(() => import("./pages/NotFound"));
const LandingPage = lazy(() => import("./pages/LandingPage"));
const FeedbackAdmin = lazy(() => import("./pages/FeedbackAdmin"));
const AdminInbox = lazy(() => import("./pages/AdminInbox"));
const AdminOpsCenter = lazy(() => import("./pages/AdminOpsCenter"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const Billing = lazy(() => import("./pages/Billing"));
const HelpCenter = lazy(() => import("./pages/HelpCenter"));
const JoinWorkspace = lazy(() => import("./pages/JoinWorkspace"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const AuthConfirm = lazy(() => import("./pages/AuthConfirm"));
const WorkspaceAnalytics = lazy(() => import("./pages/WorkspaceAnalytics"));
const RecentlyDeleted = lazy(() => import("./pages/RecentlyDeleted"));
const QuickSetup = lazy(() => import("./pages/QuickSetup"));
const CompleteSignup = lazy(() => import("./pages/CompleteSignup"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
  const PublicTour = lazy(() => import("./pages/PublicTour"));

// Legal pages
const TermsOfService = lazy(() => import("./pages/legal/TermsOfService"));
const PrivacyPolicy = lazy(() => import("./pages/legal/PrivacyPolicy"));
const AcceptableUsePolicy = lazy(() => import("./pages/legal/AcceptableUsePolicy"));
const CookiePolicy = lazy(() => import("./pages/legal/CookiePolicy"));
const SecurityPolicy = lazy(() => import("./pages/legal/SecurityPolicy"));
const LegalContact = lazy(() => import("./pages/legal/LegalContact"));
const About = lazy(() => import("./pages/About"));
const Pricing = lazy(() => import("./pages/Pricing"));

/**
 * STABLE QueryClient — created once at module scope.
 * Never recreated during component lifecycle.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      refetchOnWindowFocus: true,
      refetchOnReconnect: "always",
      retry: 1,
      refetchOnMount: true,
    },
  },
});

/**
 * ProtectedRoute — Uses centralized useAuthState hook.
 * 
 * NO per-instance auth listener.
 * NO fetch interceptor (handled by session-guard.ts).
 * NO queryClient.clear() here (handled by use-auth-state.ts).
 */
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuthState();
  const { isTourMode } = useTourMode();
  const location = useLocation();

  if (loading) {
    return <PageLoader />;
  }

  // Tour mode: allow access without auth.
  if (!user && isTourMode) {
    return <>{children}</>;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isEmailVerified(user)) {
    if (user.email) {
      setPendingVerificationEmail(user.email);
    }
    if (location.pathname !== "/verify-email" && location.pathname !== "/auth/confirm") {
      return <Navigate to="/verify-email" replace />;
    }
  }

  return <>{children}</>;
};

/** Invisible component that triggers background prefetch after login */
const LoginPrefetcher = () => { useLoginPrefetch(); return null; };

/**
 * AuthedOnly — mounts heavy post-login widgets only after the user is authenticated.
 * Keeps landing/auth pages from pulling tour, friction, session-timeout, banners.
 */
const AuthedOnly = () => {
  const { user } = useAuthState();
  if (!user) return null;
  return (
    <Suspense fallback={null}>
      <LoginPrefetcher />
      <GlobalFrictionDetector />
      <SessionTimeoutManager />
      <AnnouncementBanner />
      <BillingStatusBanner />
      <ExpiredBlocker />
      <TourEngine />
    </Suspense>
  );
};

const AppRoutes = () =>
  <RouteTransitionProvider minDuration={80}>
    <AppProvider>
      <TourModeProvider>
      <SettingsProvider>
        <SubscriptionProvider>
          <GuidanceProvider>
            <ScrollRestoration />
            <Suspense fallback={null}>
              <RouteTransitionLoader />
            </Suspense>
            <AuthedOnly />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/auth/confirm" element={<AuthConfirm />} />
                <Route path="/verify-email" element={<VerifyEmail />} />
                <Route path="/complete-signup" element={<CompleteSignup />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/demo" element={<Navigate to="/tour" replace />} />
                <Route path="/demo/*" element={<Navigate to="/tour" replace />} />
                <Route path="/tour" element={<PublicTour />} />
                <Route path="/setup" element={<ProtectedRoute><QuickSetup /></ProtectedRoute>} />
                      <Route path="/onboarding" element={<Navigate to="/dashboard" replace />} />
                      <Route path="/dashboard" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                      <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
                      <Route path="/inventory/add" element={<ProtectedRoute><AddEquipment /></ProtectedRoute>} />
                      <Route path="/inventory/import-load-plan" element={<ProtectedRoute><ImportLoadPlan /></ProtectedRoute>} />
                      <Route path="/layout-planner" element={<ProtectedRoute><FeatureGatedRoute feature="Pallet Builder"><LayoutPlanner /></FeatureGatedRoute></ProtectedRoute>} />
                      <Route path="/pallet-builder" element={<Navigate to="/layout-planner?tab=pallets" replace />} />
                      <Route path="/trailer-builder" element={<Navigate to="/layout-planner?tab=trailers" replace />} />
                      <Route path="/people" element={<ProtectedRoute><FeatureGatedRoute feature="Team"><People /></FeatureGatedRoute></ProtectedRoute>} />
                      <Route path="/calendar" element={<ProtectedRoute><FeatureGatedRoute feature="Calendar"><Calendar /></FeatureGatedRoute></ProtectedRoute>} />
                      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                      <Route path="/billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />
                      <Route path="/help" element={<HelpCenter />} />
                      <Route path="/analytics" element={<ProtectedRoute><WorkspaceAnalytics /></ProtectedRoute>} />
                      <Route path="/recently-deleted" element={<ProtectedRoute><RecentlyDeleted /></ProtectedRoute>} />
                      <Route path="/join-workspace" element={<JoinWorkspace />} />
                      <Route path="/accept-invite" element={<JoinWorkspace />} />
                      <Route path="/admin" element={<ProtectedRoute><SuperAdminRoute><AdminPanel /></SuperAdminRoute></ProtectedRoute>} />
                      <Route path="/admin/login" element={<Navigate to="/auth" replace />} />
                      <Route path="/admin/feedback" element={<ProtectedRoute><SuperAdminRoute><FeedbackAdmin /></SuperAdminRoute></ProtectedRoute>} />
                      <Route path="/admin/inbox" element={<ProtectedRoute><SuperAdminRoute><AdminInbox /></SuperAdminRoute></ProtectedRoute>} />
                      <Route path="/admin/ops" element={<ProtectedRoute><SuperAdminRoute><AdminOpsCenter /></SuperAdminRoute></ProtectedRoute>} />
                      <Route path="/admin/ops-center" element={<ProtectedRoute><SuperAdminRoute><AdminOpsCenter /></SuperAdminRoute></ProtectedRoute>} />
                      <Route path="/pricing" element={<Pricing />} />
                      <Route path="/legal/terms" element={<TermsOfService />} />
                      <Route path="/legal/privacy" element={<PrivacyPolicy />} />
                      <Route path="/legal/acceptable-use" element={<AcceptableUsePolicy />} />
                      <Route path="/legal/cookies" element={<CookiePolicy />} />
                      <Route path="/legal/security" element={<SecurityPolicy />} />
                      <Route path="/legal/contact" element={<LegalContact />} />
                      <Route path="/about" element={<About />} />
                      <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </GuidanceProvider>
        </SubscriptionProvider>
      </SettingsProvider>
      </TourModeProvider>
    </AppProvider>
  </RouteTransitionProvider>;

// Install global error handlers once at module load
installGlobalErrorHandlers();

// Install session guard (single fetch interceptor for session_not_found)
installSessionGuard();

// Initialize centralized auth listener with stable queryClient
initAuthListener(queryClient);

const App = () =>
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <MobileSearchProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </MobileSearchProvider>
    </QueryClientProvider>
  </ErrorBoundary>;

export default App;
