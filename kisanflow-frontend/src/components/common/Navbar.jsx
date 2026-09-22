import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sprout, Bell, Globe, Volume2, LogOut } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useFarmer } from '../../context/FarmerContext';
import { useWeatherDemo } from '../../context/WeatherDemoContext';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { lang, setLang, availableLanguages, t, speakText } = useLanguage();
  const { activeToken, notifications } = useFarmer();
  const { rainActive, decision } = useWeatherDemo();

  const isFarmerRoute = location.pathname.startsWith('/farmer');
  const isOfficerRoute = location.pathname.startsWith('/officer');

  const unreadCount = (notifications || []).filter((n) => n.unread).length;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('kisanflow_officer');
    localStorage.removeItem('kisanflow_farmer');
    localStorage.removeItem('kisanflow_token');
    navigate(isOfficerRoute ? '/officer/login' : '/farmer/login');
  };

  return (
    <header
      style={{
        background: '#0d3311',
        color: '#ffffff',
        borderBottom: '2px solid #2e7d32',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      }}
    >
      <div
        style={{
          maxWidth: '1440px',
          margin: '0 auto',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          minHeight: '56px',
        }}
      >
        {/* ── Brand Logo & Tagline ─────────────────────── */}
        <div
          onClick={() => navigate(isFarmerRoute ? '/farmer/dashboard' : '/')}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', flexShrink: 0 }}
        >
          <div
            style={{
              background: 'linear-gradient(135deg, #2e7d32, #ffb300)',
              borderRadius: '10px',
              width: '38px',
              height: '38px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 10px rgba(255, 179, 0, 0.3)',
              flexShrink: 0,
            }}
          >
            <Sprout size={22} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="navbar-brand-title" style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.5px' }}>
                KisanFlow{' '}
                <span style={{ color: '#ffb300' }}>किसान प्रवाह</span>
              </span>
              <span
                className="navbar-badge-sih"
                style={{
                  background: 'rgba(255,179,0,0.2)',
                  color: '#ffb300',
                  fontSize: '0.6rem',
                  padding: '2px 5px',
                  borderRadius: '4px',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                }}
              >
                SIH 2026
              </span>
            </div>
            <div className="navbar-tagline" style={{ fontSize: '0.7rem', opacity: 0.75, color: '#e2e8f0' }}>
              AI Smart Queue & Agri-Procurement System
            </div>
          </div>
        </div>

        {/* ── Portal Nav Switcher (hidden on mobile via CSS) ── */}
        <div
          className="navbar-portal-switcher"
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            padding: '4px',
            borderRadius: '12px',
            gap: '4px',
          }}
        >
          <button
            onClick={() => navigate('/farmer/dashboard')}
            style={{
              background: isFarmerRoute ? '#2e7d32' : 'transparent',
              color: '#ffffff',
              padding: '7px 14px',
              borderRadius: '8px',
              fontSize: '0.88rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              border: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            🌾 {t('appName')} (Farmer App)
          </button>
          <button
            onClick={() => navigate('/officer/command-centre')}
            style={{
              background: isOfficerRoute ? '#ffb300' : 'transparent',
              color: isOfficerRoute ? '#0d3311' : '#ffffff',
              padding: '7px 14px',
              borderRadius: '8px',
              fontSize: '0.88rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              border: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            🛡️ Officer / District Command
          </button>
          <button
            onClick={() => navigate('/trader/dashboard')}
            style={{
              background: location.pathname.startsWith('/trader') ? '#1d4ed8' : 'transparent',
              color: location.pathname.startsWith('/trader') ? '#ffffff' : '#ffffff',
              padding: '7px 14px',
              borderRadius: '8px',
              fontSize: '0.88rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              border: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            💼 Trader / Bidder Portal
          </button>
        </div>

        {/* ── Right Tools ─────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>

          {/* Active Token / Weather Alert Shortcut (farmer view only, mobile-friendly) */}
          {(activeToken || rainActive) && isFarmerRoute && (
            <div
              onClick={() => navigate('/farmer/token-status')}
              className={rainActive && !decision ? 'animate-pulse-glow' : ''}
              style={{
                background: rainActive ? 'linear-gradient(135deg, #1e3a8a, #1d4ed8)' : '#ffb300',
                color: rainActive ? '#ffffff' : '#0d3311',
                padding: '5px 10px',
                borderRadius: '20px',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                boxShadow: rainActive ? '0 4px 15px rgba(29,78,216,0.4)' : 'var(--shadow-gold)',
                border: rainActive ? '1px solid #bfdbfe' : 'none',
                whiteSpace: 'nowrap',
                maxWidth: '150px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {rainActive && !decision
                  ? '🌧️ Alert'
                  : rainActive
                  ? '🌧️ Token'
                  : `🎟️ #${activeToken?.tokenNumber}`}
              </span>
            </div>
          )}

          {/* Audio speaker — hidden on mobile */}
          <button
            className="navbar-audio-btn"
            onClick={() => speakText('किसान प्रवाह में आपका स्वागत है। अपनी भाषा चुनें या नीचे दिए गए विकल्पों का उपयोग करें।')}
            style={{
              background: 'rgba(255,255,255,0.1)',
              color: '#ffb300',
              padding: '8px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              cursor: 'pointer',
            }}
            title="Listen to audio overview"
          >
            <Volume2 size={18} />
          </button>

          {/* Notifications bell — always visible */}
          <button
            onClick={() => navigate(isFarmerRoute ? '/farmer/notifications' : '/farmer/notifications')}
            style={{
              background: 'rgba(255,255,255,0.1)',
              color: '#ffffff',
              padding: '8px',
              borderRadius: '50%',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              cursor: 'pointer',
            }}
            aria-label="Notifications"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-2px',
                  right: '-2px',
                  background: '#c62828',
                  color: '#fff',
                  fontSize: '0.6rem',
                  fontWeight: 800,
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1.5px solid #0d3311',
                }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Logout button */}
          <button
            onClick={handleLogout}
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#ef4444',
              padding: '7px 12px',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
              cursor: 'pointer',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              fontWeight: 600,
              fontSize: '0.85rem',
              whiteSpace: 'nowrap',
            }}
            title="Logout"
          >
            <LogOut size={16} />
            <span className="navbar-logout-label">Logout</span>
          </button>

          {/* Language Selector — hidden on mobile */}
          <div className="navbar-lang-selector" style={{ alignItems: 'center', gap: '5px' }}>
            <Globe size={16} color="#ffb300" />
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              style={{
                background: 'rgba(255,255,255,0.12)',
                color: '#ffffff',
                border: '1px solid rgba(255,255,255,0.2)',
                padding: '5px 8px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              {availableLanguages.map((l) => (
                <option key={l.code} value={l.code} style={{ background: '#0d3311', color: '#fff' }}>
                  {l.flag} {l.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
