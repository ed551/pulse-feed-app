import { HashRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import React, { Suspense, lazy } from "react";
import Layout from "./components/Layout";
import SystemBoundary from "./components/SystemBoundary";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { RevenueProvider } from "./contexts/RevenueContext";
import { HealthProvider } from "./contexts/HealthContext";
import { IntelligenceProvider } from "./contexts/IntelligenceContext";
import ProtectedRoute from "./components/ProtectedRoute";
import { Loader2, ShieldCheck } from "lucide-react";
import { Analytics } from "./components/Analytics";
import { motion } from "motion/react";

// Lazy load pages
const Home = lazy(() => import("./pages/Home"));
const Groups = lazy(() => import("./pages/Groups"));
const PlatformDashboard = lazy(() => import("./pages/PlatformDashboard"));
const Withdraw = lazy(() => import("./pages/Withdraw"));
const Community = lazy(() => import("./pages/Community"));
const Profile = lazy(() => import("./pages/Profile"));
const Contacts = lazy(() => import("./pages/Contacts"));
const Messages = lazy(() => import("./pages/Messages"));
const Login = lazy(() => import("./pages/Login"));
const Events = lazy(() => import("./pages/Events"));
const Settings = lazy(() => import("./pages/Settings"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Calls = lazy(() => import("./pages/Calls"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const OperationsHQ = lazy(() => import("./pages/OperationsHQ"));
const Support = lazy(() => import("./pages/Support"));
const AdsDashboard = lazy(() => import("./pages/AdsDashboard"));
const GeminiLab = lazy(() => import("./pages/GeminiLab"));
const Membership = lazy(() => import("./pages/Membership"));
const AudioHub = lazy(() => import("./pages/AudioHub"));
const EducationHub = lazy(() => import("./pages/EducationHub"));
const GoldGraph = lazy(() => import("./pages/GoldGraph"));
const PasskeyAuth = lazy(() => import("./pages/PasskeyAuth"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const B2BPortal = lazy(() => import("./pages/B2BPortal"));

import HealthChecker from "./components/HealthChecker";
import { IdleAILock } from "./components/IdleAILock";

const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
  </div>
);

const GlobalHealthWrapper = () => {
  const { currentUser, isMfaVerified } = useAuth();
  // Only show health check if logged in and passed MFA/2FA
  return currentUser && isMfaVerified ? <HealthChecker /> : null;
};

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { currentUser, loading, loginWithGoogle } = useAuth();
  
  if (loading) return <LoadingFallback />;
  
  const isDeveloper = currentUser?.email === 'edwinmuoha@gmail.com';
  
  if (!currentUser || !isDeveloper) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6 font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-[#1e293b] rounded-[3rem] p-10 shadow-2xl border border-white/5 text-center relative overflow-hidden"
        >
          {/* Decorative background element */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl"></div>

          <div className="relative z-10">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-8 rotate-3 shadow-xl">
              <ShieldCheck className="w-10 h-10 text-white" />
            </div>

            <h1 className="text-3xl font-black text-white mb-3 tracking-tight">Developer Gate</h1>
            <p className="text-slate-400 text-lg mb-10 leading-relaxed">
              This terminal is locked. Access is strictly reserved for the developer's verified Gmail account.
            </p>

            <button
              onClick={() => loginWithGoogle()}
              className="w-full py-5 bg-white text-slate-900 font-black rounded-2xl flex items-center justify-center gap-3 hover:bg-slate-100 transition-all active:scale-95 shadow-lg shadow-white/5"
            >
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
              Sign in as Developer
            </button>

            <div className="mt-8 pt-8 border-t border-white/5">
              <Link to="/" replace>
                <button className="text-slate-500 hover:text-slate-300 text-sm font-bold transition-colors">
                  Return to Main Application
                </button>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }
  
  return <>{children}</>;
};

function WakeLockHandler() {
  React.useEffect(() => {
    let wakeLock: any = null;
    
    const requestWakeLock = async () => {
      if ('wakeLock' in navigator) {
        try {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        } catch (err) {
          // Silent fallback for environments that don't support wake lock or deny permission
        }
      }
    };

    const handleVisibilityChange = async () => {
      if (wakeLock !== null && document.visibilityState === 'visible') {
        await requestWakeLock();
      }
    };

    // Use interaction to trigger wake lock to bypass browser restrictions
    const handleInteraction = () => {
      requestWakeLock();
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('click', handleInteraction);
    document.addEventListener('touchstart', handleInteraction);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
      if (wakeLock) wakeLock.release().catch(() => {});
    };
  }, []);

  return null;
}

export default function App() {
  return (
    <SystemBoundary>
      <AuthProvider>
        <RevenueProvider>
          <HealthProvider>
            <IntelligenceProvider>
              <HashRouter>
              <GlobalHealthWrapper />
              <WakeLockHandler />
              <IdleAILock />
              <Analytics />
              <Suspense fallback={<LoadingFallback />}>
                <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<Layout />}>
                  <Route index element={<Home />} />
                  <Route path="groups" element={<Groups />} />
                  <Route path="platform" element={
                    <AdminRoute>
                      <PlatformDashboard />
                    </AdminRoute>
                  } />
                  <Route path="events" element={
                    <ProtectedRoute>
                      <Events />
                    </ProtectedRoute>
                  } />
                  <Route path="community" element={
                    <ProtectedRoute>
                      <Community />
                    </ProtectedRoute>
                  } />
                  <Route path="withdraw" element={
                    <ProtectedRoute>
                      <Withdraw />
                    </ProtectedRoute>
                  } />
                  <Route path="rewards" element={<Navigate to="/withdraw" replace />} />
                  <Route path="profile" element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  } />
                  <Route path="contacts" element={
                    <ProtectedRoute>
                      <Contacts />
                    </ProtectedRoute>
                  } />
                  <Route path="messages" element={
                    <ProtectedRoute>
                      <Messages />
                    </ProtectedRoute>
                  } />
                  <Route path="settings" element={
                    <ProtectedRoute>
                      <Settings />
                    </ProtectedRoute>
                  } />
                  <Route path="notifications" element={
                    <ProtectedRoute>
                      <Notifications />
                    </ProtectedRoute>
                  } />
                  <Route path="calls" element={
                    <ProtectedRoute>
                      <Calls />
                    </ProtectedRoute>
                  } />
                  <Route path="terms" element={<Terms />} />
                  <Route path="privacy" element={<Privacy />} />
                  <Route path="b2b" element={
                    <ProtectedRoute>
                      <B2BPortal />
                    </ProtectedRoute>
                  } />
                  <Route path="operations" element={
                    <AdminRoute>
                      <OperationsHQ />
                    </AdminRoute>
                  } />
                  <Route path="support" element={<Support />} />
                  <Route path="ads" element={
                    <ProtectedRoute>
                      <AdsDashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="lab" element={<GeminiLab />} />
                  <Route path="intelligence" element={<GeminiLab />} />
                  <Route path="membership" element={
                    <ProtectedRoute>
                      <Membership />
                    </ProtectedRoute>
                  } />
                  <Route path="audio" element={
                    <ProtectedRoute>
                      <AudioHub />
                    </ProtectedRoute>
                  } />
                  <Route path="education" element={
                    <ProtectedRoute>
                      <EducationHub />
                    </ProtectedRoute>
                  } />
                  <Route path="gold" element={
                    <ProtectedRoute>
                      <GoldGraph />
                    </ProtectedRoute>
                  } />
                  <Route path="passkey-auth" element={<PasskeyAuth />} />
                  <Route path="verify-email" element={<VerifyEmail />} />
                </Route>
              </Routes>
            </Suspense>
          </HashRouter>
            </IntelligenceProvider>
        </HealthProvider>
      </RevenueProvider>
    </AuthProvider>
  </SystemBoundary>
);
}
