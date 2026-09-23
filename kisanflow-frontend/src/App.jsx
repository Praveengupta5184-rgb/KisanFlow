import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import { FarmerProvider } from './context/FarmerContext';
import { OfficerProvider } from './context/OfficerContext';
import { WeatherDemoProvider } from './context/WeatherDemoContext';
import { TraderProvider } from './context/TraderContext';

import Navbar from './components/common/Navbar';
import VoiceAssistantWidget from './components/common/VoiceAssistantWidget';
import ChatbotWidget from './components/common/ChatbotWidget';
import ProtectedRoute from './components/common/ProtectedRoute';
import FarmerLayout from './components/farmer/FarmerLayout';

// ── Auth Pages (Unified Portal) ─────────────────────────────
import KisanFlowLoginPage from './pages/auth/KisanFlowLoginPage';
import KisanFlowRegisterPage from './pages/auth/KisanFlowRegisterPage';
import FarmerLoginPage from './pages/farmer/FarmerLoginPage';
import OfficerLoginPage from './pages/officer/OfficerLoginPage';
import TraderLoginPage from './pages/trader/TraderLoginPage';

// ── Farmer Pages ────────────────────────────────────────────
import FarmerProfilePage from './pages/farmer/FarmerProfilePage';
import CentreDiscoveryPage from './pages/farmer/CentreDiscoveryPage';
import CropQualityUploadPage from './pages/farmer/CropQualityUploadPage';
import SlotBookingPage from './pages/farmer/SlotBookingPage';
import TokenStatusPage from './pages/farmer/TokenStatusPage';
import ProcurementTrackerPage from './pages/farmer/ProcurementTrackerPage';
import FarmerNotificationsPage from './pages/farmer/FarmerNotificationsPage';
import FarmerDashboardHome from './pages/farmer/FarmerDashboardHome';

// ── Officer Pages ───────────────────────────────────────────
import OfficerProfilePage from './pages/officer/OfficerProfilePage';
import DistrictCommandCentre from './pages/officer/DistrictCommandCentre';
import LiveQueueMonitor from './pages/officer/LiveQueueMonitor';
import FarmerTokenManager from './pages/officer/FarmerTokenManager';
import CrisisPredictorPanel from './pages/officer/CrisisPredictorPanel';
import BottleneckDetectionView from './pages/officer/BottleneckDetectionView';
import WhatIfSimulator from './pages/officer/WhatIfSimulator';
import ResourceOptimizationPanel from './pages/officer/ResourceOptimizationPanel';
import OfficerSimulationMode from './pages/officer/OfficerSimulationMode';
import PaymentDelayWidget from './pages/officer/PaymentDelayWidget';
import FraudRiskPanel from './pages/officer/FraudRiskPanel';
import WeatherDemoPanel from './pages/officer/WeatherDemoPanel';
import GateManagement from './pages/officer/GateManagement';
import LotManagement from './pages/officer/LotManagement';
import ProcurementManagement from './pages/officer/ProcurementManagement';

// ── Trader Pages ────────────────────────────────────────────
import TraderDashboard from './pages/trader/TraderDashboard';

/**
 * Helper: wraps a farmer page with FarmerLayout (sidebar + bottom nav) and ProtectedRoute.
 */
const FarmerRoute = ({ element }) => (
  <ProtectedRoute allowedRole="FARMER">
    <FarmerLayout>
      {element}
    </FarmerLayout>
  </ProtectedRoute>
);

/**
 * Auth routes — pages that should render WITHOUT the global Navbar / widgets.
 * All new login/register pages live here.
 */
const AUTH_PATHS = ['/login', '/register', '/farmer/login', '/officer/login', '/trader/login'];

/**
 * AppLayout — conditionally shows Navbar and floating widgets.
 * Auth pages (/login, /register) get a fully clean full-screen layout.
 */
const AppLayout = ({ children, defaultRoute }) => {
  const location = useLocation();
  const isAuthPage = AUTH_PATHS.some((p) => location.pathname === p);

  if (isAuthPage) {
    // Auth pages: no wrapper div, no navbar, no widgets — just the page itself
    return <>{children}</>;
  }

  return (
    <div className="app-container">
      <Navbar />
      <div className="main-content">
        {children}
      </div>
      <VoiceAssistantWidget />
      <ChatbotWidget />
    </div>
  );
};

function App() {
  const defaultRoute = import.meta.env.VITE_DEFAULT_ROUTE || '/login';

  return (
    <LanguageProvider>
      <FarmerProvider>
        <OfficerProvider>
          <TraderProvider>
            {/* WeatherDemoProvider wraps everything so both officer + farmer dashboards
                share the same demo state. rainActive always starts as false. */}
            <WeatherDemoProvider>
              <BrowserRouter>
                <AppLayout defaultRoute={defaultRoute}>
                  <Routes>
                    {/* Root — redirect to unified login */}
                    <Route path="/" element={<Navigate to={defaultRoute} replace />} />

                    {/* ── Auth Routes (no Navbar, no widgets) ─────────── */}
                    <Route path="/login" element={<KisanFlowLoginPage />} />
                    <Route path="/register" element={<KisanFlowRegisterPage />} />
                    <Route path="/farmer/login" element={<FarmerLoginPage />} />
                    <Route path="/officer/login" element={<OfficerLoginPage />} />
                    <Route path="/trader/login" element={<TraderLoginPage />} />

                    {/* ── Farmer Portal Routes ─────────────────────────── */}
                    {/* Dashboard home — new responsive landing page */}
                    <Route path="/farmer/dashboard" element={<FarmerRoute element={<FarmerDashboardHome />} />} />

                    {/* Discovery (centres list) — keeps original path */}
                    <Route path="/farmer/discovery" element={<FarmerRoute element={<CentreDiscoveryPage />} />} />

                    <Route path="/farmer/profile" element={<FarmerRoute element={<FarmerProfilePage />} />} />
                    <Route path="/farmer/crop-quality" element={<FarmerRoute element={<CropQualityUploadPage />} />} />
                    <Route path="/farmer/slot-booking" element={<FarmerRoute element={<SlotBookingPage />} />} />
                    <Route path="/farmer/token-status" element={<FarmerRoute element={<TokenStatusPage />} />} />
                    <Route path="/farmer/status-tracker" element={<FarmerRoute element={<ProcurementTrackerPage />} />} />
                    <Route path="/farmer/notifications" element={<FarmerRoute element={<FarmerNotificationsPage />} />} />

                    {/* ── Officer Portal Routes ────────────────────────── */}
                    <Route path="/officer/profile" element={<ProtectedRoute allowedRole="OFFICER"><OfficerProfilePage /></ProtectedRoute>} />
                    <Route path="/officer/command-centre" element={<ProtectedRoute allowedRole="OFFICER"><DistrictCommandCentre /></ProtectedRoute>} />
                    <Route path="/officer/live-queue" element={<ProtectedRoute allowedRole="OFFICER"><LiveQueueMonitor /></ProtectedRoute>} />
                    <Route path="/officer/farmer-tokens" element={<ProtectedRoute allowedRole="OFFICER"><FarmerTokenManager /></ProtectedRoute>} />
                    <Route path="/officer/crisis-predictor" element={<ProtectedRoute allowedRole="OFFICER"><CrisisPredictorPanel /></ProtectedRoute>} />
                    <Route path="/officer/bottlenecks" element={<ProtectedRoute allowedRole="OFFICER"><BottleneckDetectionView /></ProtectedRoute>} />
                    <Route path="/officer/what-if-simulator" element={<ProtectedRoute allowedRole="OFFICER"><WhatIfSimulator /></ProtectedRoute>} />
                    <Route path="/officer/resource-optimization" element={<ProtectedRoute allowedRole="OFFICER"><ResourceOptimizationPanel /></ProtectedRoute>} />
                    <Route path="/officer/simulation-mode" element={<ProtectedRoute allowedRole="OFFICER"><OfficerSimulationMode /></ProtectedRoute>} />
                    <Route path="/officer/payment-delays" element={<ProtectedRoute allowedRole="OFFICER"><PaymentDelayWidget /></ProtectedRoute>} />
                    <Route path="/officer/fraud-risks" element={<ProtectedRoute allowedRole="OFFICER"><FraudRiskPanel /></ProtectedRoute>} />
                    {/* Weather Demo — manual trigger only, never auto-starts */}
                    <Route path="/officer/weather-demo" element={<ProtectedRoute allowedRole="OFFICER"><WeatherDemoPanel /></ProtectedRoute>} />
                    <Route path="/officer/qr-scanner" element={<ProtectedRoute allowedRole="OFFICER"><GateManagement /></ProtectedRoute>} />
                    <Route path="/officer/lot-management" element={<ProtectedRoute allowedRole="OFFICER"><LotManagement /></ProtectedRoute>} />
                    <Route path="/officer/procurement" element={<ProtectedRoute allowedRole="OFFICER"><ProcurementManagement /></ProtectedRoute>} />

                    {/* ── Trader Portal Routes ─────────────────────────── */}
                    <Route path="/trader/dashboard" element={<ProtectedRoute allowedRole="TRADER"><TraderDashboard /></ProtectedRoute>} />

                    {/* Catch-all redirect */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </AppLayout>
              </BrowserRouter>
            </WeatherDemoProvider>
          </TraderProvider>
        </OfficerProvider>
      </FarmerProvider>
    </LanguageProvider>
  );
}

export default App;
