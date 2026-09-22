import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, Ticket, QrCode, Users, Bell, Sprout,
  ArrowRight, MapPin, Clock, CloudRain, CheckCircle2,
  Wifi, WifiOff, TrendingUp, ShieldCheck, Volume2,
} from 'lucide-react';
import { useFarmer } from '../../context/FarmerContext';
import { useLanguage } from '../../context/LanguageContext';
import { useWeatherDemo } from '../../context/WeatherDemoContext';

/* ── Quick Action Button ─────────────────────────────────── */
const QuickAction = ({ icon: Icon, label, sublabel, path, color, bg, onClick }) => {
  const navigate = useNavigate();
  const handleClick = () => onClick ? onClick() : navigate(path);
  return (
    <button
      onClick={handleClick}
      style={{
        flex: '1 1 140px',
        background: bg || '#ffffff',
        border: '1.5px solid #e0e6db',
        borderRadius: '16px',
        padding: '18px 14px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '10px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        minHeight: '100px',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.1)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)'; }}
    >
      <div style={{ background: color + '18', borderRadius: '12px', padding: '10px', color }}>
        <Icon size={22} strokeWidth={2} />
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>{label}</div>
        {sublabel && <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>{sublabel}</div>}
      </div>
    </button>
  );
};

/* ── Stat Card ───────────────────────────────────────────── */
const StatCard = ({ title, value, sub, icon: Icon, color, bg, border }) => (
  <div
    className="kisan-card"
    style={{ background: bg || '#fff', border: border || '1px solid #e0e6db', marginBottom: 0 }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>{title}</div>
        <div style={{ fontSize: '1.6rem', fontWeight: 900, color: color || '#0f172a', lineHeight: 1 }}>{value}</div>
        {sub && <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '6px' }}>{sub}</div>}
      </div>
      {Icon && (
        <div style={{ background: (color || '#2e7d32') + '15', borderRadius: '10px', padding: '10px', color: color || '#2e7d32', flexShrink: 0 }}>
          <Icon size={20} />
        </div>
      )}
    </div>
  </div>
);

/* ── Main Page ───────────────────────────────────────────── */
const FarmerDashboardHome = () => {
  const navigate = useNavigate();
  const { t, speakText } = useLanguage();
  const { farmer, activeToken, centreQueue, centres, wsConnected, notifications, cropPrices } = useFarmer();
  const { rainActive, decision } = useWeatherDemo();

  const unreadCount = (notifications || []).filter((n) => n.unread).length;
  const recommendedCentre = (centres || []).find((c) => c.isRecommended) || centres?.[0];
  const priceByCrop = Object.fromEntries((cropPrices || []).map((item) => [item.cropType, item.price]));
  const firstPrice = Object.entries(priceByCrop)[0];

  const STAGE_ORDER = ['token_generated', 'arrived', 'weighing', 'quality_check', 'procurement', 'payment_processing', 'payment_released'];
  const currentStageIdx = activeToken?.status ? STAGE_ORDER.indexOf(activeToken.status) : -1;
  const progressPct = currentStageIdx >= 0 ? Math.round(((currentStageIdx + 1) / STAGE_ORDER.length) * 100) : 0;

  return (
    <div className="farmer-layout">
      {/* ── MOBILE HEADER (hidden on desktop via CSS) ── */}
      <div className="farmer-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ background: 'linear-gradient(135deg, #2e7d32, #ffb300)', borderRadius: '10px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Sprout size={20} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#fff' }}>KisanFlow</div>
            <div style={{ fontSize: '0.7rem', color: '#fbbf24' }}>
              {wsConnected ? '🟢 LIVE' : '🟡 Reconnecting...'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => navigate('/farmer/notifications')}
            style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', padding: '8px', borderRadius: '50%', position: 'relative', border: 'none', cursor: 'pointer' }}
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span style={{ position: 'absolute', top: '-2px', right: '-2px', background: '#c62828', color: '#fff', fontSize: '0.6rem', fontWeight: 800, width: '16px', height: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => navigate('/farmer/profile')}
            style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', padding: '8px', borderRadius: '50%', border: 'none', cursor: 'pointer' }}
          >
            <Users size={20} />
          </button>
        </div>
      </div>

      {/* ── DESKTOP TOPBAR (hidden on mobile via CSS) ── */}
      <div className="farmer-desktop-topbar">
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            🌾 नमस्ते, {farmer?.name || 'Farmer'} जी!
          </h1>
          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '4px 0 0' }}>
            📍 {farmer?.village || 'Your Location'} &nbsp;•&nbsp;
            <span style={{ color: wsConnected ? '#15803d' : '#b45309', fontWeight: 600 }}>
              {wsConnected ? '🟢 Live Queue Connected' : '🟡 Reconnecting...'}
            </span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={() => speakText(`नमस्ते ${farmer?.name || 'किसान'} जी! आपका KisanFlow डैशबोर्ड तैयार है।`)}
            style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#2e7d32', padding: '8px 12px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
          >
            <Volume2 size={16} /> Audio
          </button>
          <button
            onClick={() => navigate('/farmer/notifications')}
            style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#0f172a', padding: '8px 12px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '0.85rem', position: 'relative', cursor: 'pointer' }}
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span style={{ background: '#c62828', color: '#fff', fontSize: '0.65rem', fontWeight: 800, padding: '1px 5px', borderRadius: '9999px' }}>{unreadCount}</span>
            )}
            Notifications
          </button>
          <button
            onClick={() => navigate('/farmer/slot-booking')}
            style={{ background: '#2e7d32', color: '#fff', padding: '10px 20px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.9rem', border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(46,125,50,0.3)' }}
          >
            <Calendar size={16} /> Book Slot
          </button>
        </div>
      </div>

      {/* ── PAGE BODY ──────────────────────────────────── */}
      <div className="farmer-body">

        {/* Mobile welcome (hidden on desktop) */}
        <div className="mobile-only" style={{ marginBottom: '16px' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
            नमस्ते, {farmer?.name || 'Farmer'} जी! 🌾
          </h2>
          <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
            {farmer?.village || 'Your Location'}
          </p>
        </div>

        {/* ── WEATHER ALERT (if active) ─────────────────── */}
        {rainActive && !decision && (
          <div
            className="animate-pulse-glow"
            style={{ background: 'linear-gradient(135deg, #1e3a8a, #1d4ed8)', borderRadius: '16px', padding: '16px 20px', marginBottom: '20px', cursor: 'pointer', boxShadow: '0 8px 24px rgba(29,78,216,0.35)' }}
            onClick={() => navigate('/farmer/token-status')}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ background: '#fbbf24', borderRadius: '50%', padding: '8px', display: 'flex' }}>
                  <CloudRain size={18} color="#0f172a" />
                </div>
                <div>
                  <div style={{ fontWeight: 800, color: '#fff', fontSize: '1rem' }}>🌧️ Weather Alert Active</div>
                  <div style={{ fontSize: '0.8rem', color: '#bfdbfe' }}>Heavy rain may affect your booking. Tap to take action.</div>
                </div>
              </div>
              <ArrowRight size={18} color="#bfdbfe" />
            </div>
          </div>
        )}

        {/* ── ACTIVE TOKEN BANNER ──────────────────────── */}
        {activeToken && (
          <div
            style={{
              background: 'linear-gradient(135deg, #0d3311, #1b5e20)',
              borderRadius: '18px',
              padding: '20px',
              marginBottom: '20px',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-gold)',
              border: '2px solid rgba(255,179,0,0.3)',
            }}
            onClick={() => navigate('/farmer/token-status')}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#fbbf24', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>
                  Active Token
                </div>
                <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#fff', lineHeight: 1.1 }}>
                  #{activeToken.tokenNumber}
                </div>
                <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.75)', marginTop: '4px' }}>
                  {activeToken.centreName} &nbsp;•&nbsp; {activeToken.timeSlot || 'Slot booked'}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '10px', padding: '8px 14px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.6)' }}>Queue Position</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#fff' }}>#{activeToken.queuePosition || '—'}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '10px', padding: '8px 14px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.6)' }}>ETA</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#4ade80' }}>~{activeToken.etaMinutes || '?'}m</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fbbf24', fontSize: '0.82rem', fontWeight: 700 }}>
                View Token & QR <ArrowRight size={14} />
              </div>
            </div>
          </div>
        )}

        {/* ── QUICK ACTIONS ────────────────────────────── */}
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
            Quick Actions
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            <QuickAction icon={Calendar} label="Book Slot" sublabel="New appointment" path="/farmer/slot-booking" color="#2e7d32" />
            <QuickAction icon={Ticket} label="My Token" sublabel="View & QR code" path="/farmer/token-status" color="#1565c0" />
            <QuickAction icon={QrCode} label="View QR" sublabel="Show at mandi gate" path="/farmer/token-status" color="#7c3aed" />
            <QuickAction icon={Users} label="Live Queue" sublabel="Track procurement" path="/farmer/status-tracker" color="#c2410c" />
          </div>
        </div>

        {/* ── STATS GRID ───────────────────────────────── */}
        <div className="farmer-dashboard-grid" style={{ marginBottom: '20px' }}>
          <StatCard
            title="Farmers Inside Mandi Right Now"
            value={centreQueue?.activeFarmerCount ?? 0}
            sub={wsConnected ? '🟢 Live count' : '🟡 Reconnecting...'}
            icon={Users}
            color="#15803d"
            bg="#f0fdf4"
            border="1px solid #bbf7d0"
          />
          <StatCard
            title="Current Serving Token"
            value={activeToken?.currentServing || '—'}
            sub="At selected mandi"
            icon={Ticket}
            color="#1565c0"
            bg="#eff6ff"
            border="1px solid #bfdbfe"
          />
          <StatCard
            title="Farmers Ahead of You"
            value={activeToken?.farmersRemaining ?? '—'}
            sub="In your queue"
            icon={Clock}
            color="#d97706"
            bg="#fffbeb"
            border="1px solid #fde68a"
          />
          <StatCard
            title="Today's MSP Rate"
            value={firstPrice ? `₹${firstPrice[1]}/Q` : '—'}
            sub={firstPrice ? firstPrice[0] : 'Rate not set by officer'}
            icon={TrendingUp}
            color="#7c3aed"
            bg="#f5f3ff"
            border="1px solid #ddd6fe"
          />
        </div>

        {/* ── AI RECOMMENDED CENTRE ────────────────────── */}
        {recommendedCentre && (
          <div
            className="kisan-card"
            style={{ background: 'linear-gradient(135deg, #fffbeb, #fef3c7)', border: '2px solid #f59e0b', boxShadow: 'var(--shadow-gold)', marginBottom: '20px' }}
          >
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#d97706', color: '#fff', fontSize: '0.72rem', fontWeight: 800, padding: '3px 10px', borderRadius: '20px', marginBottom: '10px' }}>
              ✨ {t('aiRecommendation')}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ flex: 1, minWidth: '180px' }}>
                <h3 style={{ color: '#78350f', fontSize: '1.1rem', marginBottom: '4px' }}>{recommendedCentre.name}</h3>
                <p style={{ fontSize: '0.82rem', color: '#92400e', fontWeight: 600, marginBottom: '12px' }}>
                  💡 {recommendedCentre.recommendationReason}
                </p>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.68rem', color: '#64748b' }}>{t('distance')}</div>
                    <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>{recommendedCentre.distanceKm} km</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.68rem', color: '#64748b' }}>{t('estWait')}</div>
                    <div style={{ fontWeight: 800, color: '#16a34a', fontSize: '0.9rem' }}>⚡ {recommendedCentre.estWaitMinutes} min</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.68rem', color: '#64748b' }}>{t('timeSaved')}</div>
                    <div style={{ fontWeight: 800, color: '#d97706', fontSize: '0.9rem' }}>🎉 {recommendedCentre.timeSavedHours}</div>
                  </div>
                </div>
              </div>
              <button
                onClick={() => navigate('/farmer/slot-booking')}
                style={{ background: 'linear-gradient(135deg, #15803d, #166534)', color: '#fff', padding: '12px 20px', borderRadius: '12px', fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 4px 12px rgba(21,128,61,0.3)' }}
              >
                {t('bookSlot')} <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ── PROCUREMENT PROGRESS (if active) ─────────── */}
        {activeToken && (
          <div className="kisan-card" style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <h4 style={{ fontSize: '0.95rem', margin: 0 }}>Procurement Journey</h4>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Token #{activeToken.tokenNumber}
                </span>
              </div>
              <button
                onClick={() => navigate('/farmer/status-tracker')}
                style={{ background: '#e8f5e9', color: '#2e7d32', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                Details <ArrowRight size={12} />
              </button>
            </div>

            {/* Progress bar */}
            <div style={{ background: '#f1f5f9', borderRadius: '999px', height: '10px', overflow: 'hidden', marginBottom: '8px' }}>
              <div style={{ background: 'linear-gradient(90deg, #2e7d32, #4ade80)', height: '100%', width: `${progressPct}%`, borderRadius: '999px', transition: 'width 0.5s ease' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b' }}>
              <span>Token Generated</span>
              <span style={{ fontWeight: 700, color: '#2e7d32' }}>{progressPct}%</span>
              <span>Payment Released</span>
            </div>

            <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ background: '#e8f5e9', borderRadius: '8px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={14} color="#15803d" />
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#15803d' }}>
                  {String(activeToken.status || 'token_generated').replaceAll('_', ' ').toUpperCase()}
                </span>
              </div>
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Current stage</span>
            </div>
          </div>
        )}

        {/* ── MANDI CENTRES SUMMARY ────────────────────── */}
        {(centres || []).length > 0 && (
          <div className="kisan-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h4 style={{ fontSize: '0.95rem', margin: 0 }}>Nearby Mandis</h4>
              <button
                onClick={() => navigate('/farmer/discovery')}
                style={{ background: 'none', border: 'none', color: '#2e7d32', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                View all <ArrowRight size={12} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(centres || []).slice(0, 3).map((centre) => (
                <div
                  key={centre.id}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#f8fafc', borderRadius: '10px', gap: '10px', flexWrap: 'wrap' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '150px' }}>
                    <div style={{ background: '#e8f5e9', borderRadius: '8px', padding: '6px', color: '#2e7d32', flexShrink: 0 }}>
                      <MapPin size={14} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>{centre.name}</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{centre.distanceKm} km &nbsp;•&nbsp; {centre.liveQueueCount} farmers waiting</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: centre.capacityStatus === 'LOW' ? '#15803d' : '#d97706', background: centre.capacityStatus === 'LOW' ? '#f0fdf4' : '#fffbeb', padding: '3px 8px', borderRadius: '6px' }}>
                      {centre.estWaitMinutes}m wait
                    </span>
                    <button
                      onClick={() => navigate('/farmer/slot-booking')}
                      style={{ background: '#2e7d32', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Book
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No token state — CTA */}
        {!activeToken && (
          <div style={{ textAlign: 'center', padding: '20px', marginTop: '8px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🌾</div>
            <h3 style={{ color: '#0f172a', marginBottom: '8px', fontSize: '1.1rem' }}>Ready to sell your produce?</h3>
            <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '20px' }}>
              Book a slot at your nearest mandi and get your digital token instantly.
            </p>
            <button
              onClick={() => navigate('/farmer/slot-booking')}
              className="btn-primary btn-full"
              style={{ maxWidth: '320px', margin: '0 auto' }}
            >
              <Calendar size={18} /> Book Mandi Slot Now
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default FarmerDashboardHome;
