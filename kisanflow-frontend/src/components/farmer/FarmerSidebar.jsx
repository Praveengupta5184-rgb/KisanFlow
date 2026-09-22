import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Sprout, Home, Calendar, Ticket, Users, QrCode,
  Leaf, CreditCard, Bell, User, LogOut, ChevronRight,
  Wifi, WifiOff,
} from 'lucide-react';
import { useFarmer } from '../../context/FarmerContext';

const NAV_ITEMS = [
  { label: 'Dashboard',          icon: Home,     path: '/farmer/discovery',     desc: 'Overview & Centres' },
  { label: 'Book Slot',          icon: Calendar, path: '/farmer/slot-booking',  desc: 'Select date & time' },
  { label: 'My Booking / Token', icon: Ticket,   path: '/farmer/token-status',  desc: 'QR & queue info' },
  { label: 'Live Queue',         icon: Users,    path: '/farmer/status-tracker',desc: 'Procurement tracker' },
  { label: 'QR / Entry-Exit',    icon: QrCode,   path: '/farmer/crop-quality',  desc: 'Quality & QR scan' },
  { label: 'Notifications',      icon: Bell,     path: '/farmer/notifications', desc: 'Alerts & updates' },
  { label: 'My Profile',         icon: User,     path: '/farmer/profile',       desc: 'Account settings' },
];

const FarmerSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { farmer, activeToken, wsConnected, notifications } = useFarmer();
  const unreadCount = (notifications || []).filter((n) => n.unread).length;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('kisanflow_farmer');
    localStorage.removeItem('kisanflow_token');
    navigate('/farmer/login');
  };

  return (
    <aside className="farmer-sidebar" role="navigation" aria-label="Farmer sidebar navigation">
      {/* ── BRAND ─────────────────────────────────────── */}
      <div
        style={{
          padding: '24px 20px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          cursor: 'pointer',
        }}
        onClick={() => navigate('/farmer/discovery')}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              background: 'linear-gradient(135deg, #2e7d32, #ffb300)',
              borderRadius: '12px',
              width: '42px',
              height: '42px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 10px rgba(255, 179, 0, 0.3)',
              flexShrink: 0,
            }}
          >
            <Sprout size={24} color="#ffffff" />
          </div>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>
              KisanFlow
            </div>
            <div style={{ fontSize: '0.72rem', color: '#fbbf24', fontWeight: 600 }}>
              किसान प्रवाह
            </div>
          </div>
        </div>
        <div style={{ marginTop: '8px', fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>
          AI Smart Queue & Agri-Procurement
        </div>
      </div>

      {/* ── FARMER INFO PILL ──────────────────────────── */}
      {farmer && (
        <div
          style={{
            margin: '16px 16px 0',
            background: 'rgba(255,255,255,0.07)',
            borderRadius: '12px',
            padding: '12px 14px',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#fff' }}>
                {farmer.name || 'Farmer'}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.55)', marginTop: '2px' }}>
                📍 {farmer.village || 'Location not set'}
              </div>
            </div>
            {/* WebSocket status dot */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.65rem',
                color: wsConnected ? '#4ade80' : '#fbbf24',
              }}
            >
              {wsConnected
                ? <Wifi size={12} color="#4ade80" />
                : <WifiOff size={12} color="#fbbf24" />}
              <span>{wsConnected ? 'LIVE' : 'Reconnecting'}</span>
            </div>
          </div>

          {/* Active token quick info */}
          {activeToken && (
            <div
              style={{
                marginTop: '10px',
                background: '#ffb300',
                borderRadius: '8px',
                padding: '6px 10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
              }}
              onClick={() => navigate('/farmer/token-status')}
            >
              <span style={{ fontWeight: 800, color: '#0d3311', fontSize: '0.82rem' }}>
                🎟️ Token #{activeToken.tokenNumber}
              </span>
              {activeToken.etaMinutes && (
                <span style={{ fontSize: '0.7rem', color: '#0d3311', fontWeight: 600 }}>
                  ~{activeToken.etaMinutes}m ETA
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── NAV LINKS ─────────────────────────────────── */}
      <nav style={{ flex: 1, padding: '12px 10px', overflow: 'auto' }}>
        {NAV_ITEMS.map(({ label, icon: Icon, path, desc }) => {
          const isActive = location.pathname === path;
          const isBell = label === 'Notifications';

          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              aria-current={isActive ? 'page' : undefined}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '11px 14px',
                borderRadius: '10px',
                marginBottom: '2px',
                background: isActive
                  ? 'rgba(255,255,255,0.12)'
                  : 'transparent',
                border: isActive
                  ? '1px solid rgba(255,255,255,0.15)'
                  : '1px solid transparent',
                color: isActive ? '#ffffff' : 'rgba(255,255,255,0.65)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
                WebkitTapHighlightColor: 'transparent',
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.07)';
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.background = 'transparent';
              }}
            >
              {/* Left accent bar */}
              {isActive && (
                <span
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    height: '60%',
                    width: '3px',
                    background: '#ffb300',
                    borderRadius: '0 2px 2px 0',
                  }}
                />
              )}

              <span style={{ position: 'relative', display: 'flex', flexShrink: 0 }}>
                <Icon size={18} strokeWidth={isActive ? 2.5 : 1.8} />
                {isBell && unreadCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-5px',
                      right: '-6px',
                      background: '#c62828',
                      color: '#fff',
                      fontSize: '0.55rem',
                      fontWeight: 800,
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </span>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: isActive ? 700 : 500, fontSize: '0.88rem', lineHeight: 1.2 }}>
                  {label}
                </div>
                <div
                  style={{
                    fontSize: '0.68rem',
                    color: 'rgba(255,255,255,0.4)',
                    marginTop: '1px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {desc}
                </div>
              </div>

              {isActive && <ChevronRight size={14} style={{ opacity: 0.6, flexShrink: 0 }} />}
            </button>
          );
        })}
      </nav>

      {/* ── BOTTOM — LOGOUT ───────────────────────────── */}
      <div
        style={{
          padding: '16px',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          flexShrink: 0,
        }}
      >
        <button
          onClick={handleLogout}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 14px',
            borderRadius: '10px',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: '#fca5a5',
            fontWeight: 600,
            fontSize: '0.88rem',
            cursor: 'pointer',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.22)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)'; }}
        >
          <LogOut size={16} />
          Sign Out
        </button>
        <div
          style={{
            marginTop: '10px',
            fontSize: '0.65rem',
            color: 'rgba(255,255,255,0.3)',
            textAlign: 'center',
          }}
        >
          KisanFlow SIH 2026 • v1.0
        </div>
      </div>
    </aside>
  );
};

export default FarmerSidebar;
