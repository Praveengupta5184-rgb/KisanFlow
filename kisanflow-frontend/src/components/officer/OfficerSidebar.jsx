import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Activity,
  AlertTriangle,
  GitPullRequest,
  Sliders,
  Users,
  Users2,
  CreditCard,
  ShieldAlert,
  LogOut,
  Building,
  CloudRain,
  Menu,
  X,
  Bell,
} from 'lucide-react';
import { useOfficer } from '../../context/OfficerContext';
import { useWeatherDemo } from '../../context/WeatherDemoContext';

const OfficerSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { officer, alerts } = useOfficer();
  const { rainActive } = useWeatherDemo();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const closeDrawer = () => setIsDrawerOpen(false);

  const activeAlertCount = alerts.filter((a) => a.status === 'pending').length;

  const navItems = [
    { path: '/officer/profile', label: 'My Profile', icon: Users },
    { path: '/officer/command-centre', label: 'District Command Center', icon: LayoutDashboard },
    { path: '/officer/qr-scanner', label: '📷 Gate Management', icon: Activity },
    { path: '/officer/live-queue', label: 'Live Queue Monitor', icon: Activity },
    { path: '/officer/farmer-tokens', label: '🌾 Farmer Token Management', icon: Users2 },
    { path: '/officer/lot-management', label: '📦 Lot Management', icon: Users2 },
    { path: '/officer/procurement', label: '💳 Procurement & Payment', icon: CreditCard },
    { path: '/officer/crisis-predictor', label: 'Crisis Predictor Alerts', icon: AlertTriangle, badge: activeAlertCount },
    { path: '/officer/bottlenecks', label: 'Bottleneck Detection', icon: GitPullRequest },
    { path: '/officer/what-if-simulator', label: 'What-If Queue Simulator', icon: Sliders },
    { path: '/officer/resource-optimization', label: 'Resource Optimization', icon: Users },
    { path: '/officer/simulation-mode', label: 'Officer Simulation Mode', icon: Sliders },
    { path: '/officer/weather-demo', label: '🌦️ Weather Demo', icon: CloudRain, badge: rainActive ? '🌧️' : 0, badgeRain: rainActive },
    { path: '/officer/payment-delays', label: 'Payment Delay Risks', icon: CreditCard },
    { path: '/officer/fraud-risks', label: 'Anomaly & Yield Risks', icon: ShieldAlert },
  ];

  return (
    <>
      {/* ── MOBILE HEADER (Hidden on Desktop) ── */}
      <div className="officer-mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => setIsDrawerOpen(true)} style={{ background: 'transparent', border: 'none', color: '#fff', display: 'flex' }}>
            <Menu size={24} />
          </button>
          <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>KisanFlow</div>
        </div>
        <div>
          <button style={{ background: 'transparent', border: 'none', color: '#fff', display: 'flex', position: 'relative' }}>
            <Bell size={20} />
            {activeAlertCount > 0 && (
              <span style={{ position: 'absolute', top: -5, right: -5, background: '#dc2626', color: '#fff', fontSize: '0.6rem', padding: '2px 5px', borderRadius: '50%', fontWeight: 700 }}>
                {activeAlertCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── DRAWER OVERLAY ── */}
      {isDrawerOpen && (
        <div className="officer-drawer-overlay" onClick={closeDrawer}></div>
      )}

      {/* ── SIDEBAR / DRAWER ── */}
      <aside className={`officer-sidebar ${isDrawerOpen ? 'drawer-open' : ''}`}>
        
        {/* Mobile Close Button (Hidden on Desktop) */}
        <div className="officer-mobile-only" style={{ padding: '12px 16px', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1e293b' }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>KisanFlow</div>
          <button onClick={closeDrawer} style={{ background: 'transparent', border: 'none', color: '#cbd5e1', display: 'flex' }}>
            <X size={24} />
          </button>
        </div>

        {/* Officer Profile Badge */}
      <div style={{ padding: '20px', borderBottom: '1px solid #1e293b' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <div
            style={{
              background: '#2e7d32',
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
            }}
          >
            {officer?.username?.[0] || 'O'}
          </div>
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc' }}>
              {officer?.username || 'District Officer'}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              {officer?.role || 'DISTRICT_OFFICER'}
            </div>
          </div>
        </div>
        <div style={{ fontSize: '0.7rem', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.1)', padding: '2px 8px', borderRadius: '4px', display: 'inline-block' }}>
          📍 {officer?.district || 'Patiala-Kapurthala Zone'}
        </div>
      </div>

      {/* Nav links */}
      <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto' }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <button
              key={item.path}
              onClick={() => { navigate(item.path); closeDrawer(); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: '10px',
                background: isActive ? '#2e7d32' : 'transparent',
                color: isActive ? '#ffffff' : '#94a3b8',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.85rem',
                textAlign: 'left',
                border: 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Icon size={18} color={isActive ? '#ffffff' : '#64748b'} />
                <span>{item.label}</span>
              </div>
              {item.badgeRain && (
                <span
                  style={{
                    background: '#1d4ed8',
                    color: '#fff',
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    padding: '2px 7px',
                    borderRadius: '10px',
                    animation: 'pulse 1.5s infinite',
                  }}
                >
                  LIVE
                </span>
              )}
              {!item.badgeRain && item.badge > 0 && (
                <span
                  style={{
                    background: '#dc2626',
                    color: '#fff',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    padding: '2px 6px',
                    borderRadius: '10px',
                  }}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Logout / Switch */}
      <div style={{ padding: '16px', borderTop: '1px solid #1e293b' }}>
        <button
          onClick={() => navigate('/farmer/discovery')}
          style={{
            width: '100%',
            background: 'rgba(255, 255, 255, 0.06)',
            color: '#cbd5e1',
            padding: '10px',
            borderRadius: '8px',
            fontSize: '0.8rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginBottom: '10px',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          <span>🌾 Switch to Farmer App</span>
        </button>

        <button
          onClick={() => {
            localStorage.removeItem('token');
            localStorage.removeItem('role');
            localStorage.removeItem('kisanflow_officer');
            navigate('/officer/login');
          }}
          style={{
            width: '100%',
            background: 'rgba(239, 68, 68, 0.1)',
            color: '#ef4444',
            padding: '10px',
            borderRadius: '8px',
            fontSize: '0.8rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            cursor: 'pointer'
          }}
        >
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
    </>
  );
};

export default OfficerSidebar;
