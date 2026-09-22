import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navigation, Volume2, ArrowRight, AlertCircle, CloudRain, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useFarmer } from '../../context/FarmerContext';
import { useWeatherDemo, DEMO_FARMER } from '../../context/WeatherDemoContext';
import { farmerApi } from '../../services/api';
import QRCode from 'qrcode';

// ─── Weather Alert Banner — shown to demo farmer T105 when rain is active ────
const WeatherAlertBanner = ({ rainActive, decision, newSlot, reschedule, keepToken, cancelToken, displayToken }) => {
  if (!rainActive) return null;

  // After farmer made a decision — show result
  if (decision === 'RESCHEDULED' && newSlot) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
        border: '2px solid #22c55e',
        borderRadius: '16px',
        padding: '18px',
        marginBottom: '16px',
        boxShadow: '0 6px 20px rgba(34, 197, 94, 0.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
          <CheckCircle2 size={22} color="#16a34a" />
          <h4 style={{ margin: 0, color: '#14532d', fontSize: '1rem' }}>
            ✅ Rescheduling Successful
          </h4>
        </div>
        <p style={{ margin: '0 0 12px', fontSize: '0.85rem', color: '#166534' }}>
          Your token <strong>{displayToken.token}</strong> has been automatically rescheduled because of heavy rain.
        </p>
        <div style={{
          background: '#ffffff', borderRadius: '10px', padding: '14px',
          border: '1px solid #bbf7d0', fontSize: '0.9rem', color: '#0f172a',
        }}>
          <div style={{ fontWeight: 800, marginBottom: '8px', color: '#14532d' }}>New Appointment</div>
          <div>📅 <strong>{newSlot.date}</strong></div>
          <div>🕐 <strong>{newSlot.time}</strong></div>
          <div>🎟️ Token: <strong>{displayToken.token}</strong></div>
          <div>🚨 Slot Type: <strong>Emergency Weather Slot</strong></div>
        </div>
        <p style={{ margin: '10px 0 0', fontSize: '0.78rem', color: '#4d7c0f', fontStyle: 'italic' }}>
          No new token has been generated. Your identity in the queue is preserved.
        </p>
      </div>
    );
  }

  if (decision === 'KEPT') {
    return (
      <div style={{
        background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
        border: '2px solid #3b82f6',
        borderRadius: '16px',
        padding: '18px',
        marginBottom: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <CheckCircle2 size={22} color="#2563eb" />
          <h4 style={{ margin: 0, color: '#1e3a8a', fontSize: '1rem' }}>
            🎟️ Token {displayToken.token} Retained
          </h4>
        </div>
        <p style={{ margin: 0, fontSize: '0.88rem', color: '#1e40af' }}>
          Your existing token <strong>{displayToken.token}</strong> has been retained.
          You can continue with your original appointment: <strong>{displayToken.date} at {displayToken.time}</strong>.
        </p>
      </div>
    );
  }

  if (decision === 'CANCELLED') {
    return (
      <div style={{
        background: 'linear-gradient(135deg, #fff1f2, #fee2e2)',
        border: '2px solid #ef4444',
        borderRadius: '16px',
        padding: '18px',
        marginBottom: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <XCircle size={22} color="#dc2626" />
          <h4 style={{ margin: 0, color: '#991b1b', fontSize: '1rem' }}>
            ❌ Appointment Cancelled
          </h4>
        </div>
        <p style={{ margin: 0, fontSize: '0.88rem', color: '#b91c1c' }}>
          Token <strong>{displayToken.token}</strong> has been cancelled successfully.
        </p>
      </div>
    );
  }

  // No decision yet — show the 3-choice alert
  return (
    <div style={{
      background: 'linear-gradient(135deg, #1e3a8a, #1d4ed8)',
      borderRadius: '18px',
      padding: '20px',
      marginBottom: '16px',
      boxShadow: '0 8px 24px rgba(29, 78, 216, 0.4)',
      animation: 'pulse 2s infinite',
    }}>
      {/* Demo label */}
      <div style={{
        background: 'rgba(251, 191, 36, 0.2)',
        border: '1px solid #fbbf24',
        borderRadius: '6px',
        padding: '3px 10px',
        fontSize: '0.68rem',
        fontWeight: 800,
        color: '#fbbf24',
        display: 'inline-block',
        marginBottom: '10px',
        letterSpacing: '1px',
      }}>
        ⚠️ DEMO / SIMULATED WEATHER
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
        <div style={{ background: '#fbbf24', borderRadius: '50%', padding: '8px', display: 'flex' }}>
          <CloudRain size={20} color="#0f172a" />
        </div>
        <h4 style={{ margin: 0, color: '#ffffff', fontSize: '1.05rem' }}>
          🌧️ Weather Alert
        </h4>
      </div>

      <p style={{ margin: '0 0 14px', fontSize: '0.88rem', color: '#bfdbfe', lineHeight: 1.5 }}>
        Heavy rain has been detected for your scheduled procurement time.
      </p>

      {/* Token details */}
      <div style={{
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '12px',
        padding: '14px',
        marginBottom: '16px',
        fontSize: '0.88rem',
        color: '#ffffff',
      }}>
        <div>Your current appointment:</div>
        <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div>🎟️ Token: <strong style={{ color: '#fbbf24', fontSize: '1.05rem' }}>{displayToken.token}</strong></div>
          <div>📅 Date: <strong>{displayToken.date}</strong></div>
          <div>🕐 Time: <strong>{displayToken.time}</strong></div>
          <div>📍 Mandi: <strong>{displayToken.mandi}</strong></div>
        </div>
      </div>

      <p style={{ margin: '0 0 14px', fontSize: '0.85rem', color: '#e0e7ff' }}>
        Please choose what you want to do:
      </p>

      {/* 3 choice buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button
          id="btn-farmer-reschedule"
          onClick={reschedule}
          style={{
            padding: '14px',
            fontSize: '0.95rem',
            fontWeight: 800,
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(34, 197, 94, 0.4)',
          }}
        >
          <RefreshCw size={18} /> 🔄 RESCHEDULE
        </button>

        <button
          id="btn-farmer-keep-token"
          onClick={keepToken}
          style={{
            padding: '14px',
            fontSize: '0.95rem',
            fontWeight: 800,
            background: 'rgba(255,255,255,0.15)',
            color: '#ffffff',
            border: '2px solid rgba(255,255,255,0.3)',
            borderRadius: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          🎟️ KEEP SAME TOKEN
        </button>

        <button
          id="btn-farmer-cancel-token"
          onClick={cancelToken}
          style={{
            padding: '14px',
            fontSize: '0.95rem',
            fontWeight: 800,
            background: 'rgba(239, 68, 68, 0.2)',
            color: '#fecaca',
            border: '2px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <XCircle size={18} /> ❌ CANCEL
        </button>
      </div>
    </div>
  );
};

// ─── Real QR Canvas Component ────────────────────────────────────────────────
const QrCanvas = ({ qrId, size = 120 }) => {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!qrId || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, `KFQR:${qrId}`, {
      width: size,
      margin: 1,
      color: { dark: '#0f172a', light: '#ffffff' },
    }).catch(() => {});
  }, [qrId, size]);
  if (!qrId) return (
    <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', borderRadius: 8, color: '#94a3b8', fontSize: '0.75rem' }}>
      QR unavailable
    </div>
  );
  return <canvas ref={canvasRef} />;
};

// ─── Entry/Exit Status Badge ──────────────────────────────────────────────────
const MandiEntryStatus = ({ entryStatus, exitStatus, insideMandi, entryTime, exitTime }) => {
  const fmt = (iso) => {
    if (!iso) return '';
    try { return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }); } catch { return iso; }
  };
  if (entryStatus === 'EXITED' || exitStatus === 'EXITED') {
    return (
      <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 10, background: '#f1f5f9', border: '1px solid #cbd5e1', textAlign: 'center' }}>
        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', marginBottom: 4 }}>मंडी प्रवेश स्थिति</div>
        <div style={{ fontWeight: 800, color: '#475569', fontSize: '0.95rem' }}>⚪ EXITED</div>
        <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 4 }}>
          Entry: {fmt(entryTime)} &nbsp;|&nbsp; Exit: {fmt(exitTime)}
        </div>
      </div>
    );
  }
  if (entryStatus === 'ENTERED' || insideMandi) {
    return (
      <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 10, background: '#f0fdf4', border: '2px solid #22c55e', textAlign: 'center' }}>
        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#15803d', marginBottom: 4 }}>मंडी प्रवेश स्थिति</div>
        <div style={{ fontWeight: 800, color: '#15803d', fontSize: '1rem' }}>🟢 INSIDE MANDI</div>
        <div style={{ fontSize: '0.72rem', color: '#166534', marginTop: 4 }}>Entry at: {fmt(entryTime)}</div>
      </div>
    );
  }
  return (
    <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 10, background: '#fffbeb', border: '2px dashed #f59e0b', textAlign: 'center' }}>
      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#b45309', marginBottom: 4 }}>मंडी प्रवेश स्थिति</div>
      <div style={{ fontWeight: 800, color: '#d97706', fontSize: '0.95rem' }}>🟡 AWAITING ENTRY</div>
      <div style={{ fontSize: '0.72rem', color: '#92400e', marginTop: 4 }}>Officer mandi gate scan करेगा</div>
    </div>
  );
};

// ─── Main TokenStatusPage ────────────────────────────────────────────────────
const TokenStatusPage = () => {
  const navigate = useNavigate();
  const { t, speakText } = useLanguage();
  const { activeToken, centreQueue, personalQueue, wsConnected, setActiveToken } = useFarmer();

  // Weather demo — only active when officer manually triggers it
  const { rainActive, decision, newSlot, reschedule, keepToken, cancelToken } = useWeatherDemo();

  // Show weather alert whenever rain is active, regardless of which farmer is logged in
  const showWeatherAlert = rainActive;

  // Use real activeToken details if available, otherwise fall back to DEMO_FARMER
  const displayToken = activeToken ? {
    token: activeToken.tokenNumber || DEMO_FARMER.token,
    date: activeToken.bookingDate || DEMO_FARMER.date,
    time: activeToken.timeSlot || DEMO_FARMER.time,
    mandi: activeToken.centreName || DEMO_FARMER.mandi,
  } : DEMO_FARMER;

  const refreshStatus = async () => {
    if (!activeToken?.id) return;
    const queueStatus = await farmerApi.getQueueStatus(activeToken.id);
    setActiveToken(prev => ({ ...prev, ...queueStatus, tokenNumber: queueStatus.token, currentServing: queueStatus.currentServingToken, farmersRemaining: queueStatus.farmersAhead, queuePosition: queueStatus.queuePosition, etaMinutes: queueStatus.estimatedWaitMinutes }));
  };

  const handleSpeakStatus = () => {
    if (showWeatherAlert && !decision) {
      speakText(`मौसम चेतावनी! आपके टोकन नंबर ${displayToken.token} के लिए भारी बारिश की जानकारी मिली है। कृपया रीशेड्यूल, रखें, या रद्द करें में से एक चुनें।`);
      return;
    }
    speakText(`आपका टोकन नंबर ${activeToken?.tokenNumber || displayToken.token} है। अभी टोकन ${activeToken?.currentServing || 'N/A'} चल रहा है।`);
  };

  // ── If no real activeToken and demo rain is NOT active, show no-token state ──
  if (!activeToken && !rainActive) {
    return (
      <div className="farmer-layout">
        <div className="farmer-header">
          <h3 style={{ color: '#fff', margin: 0 }}>टोकन स्थिति</h3>
        </div>
        <div className="farmer-body" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <AlertCircle size={48} color="#f59e0b" style={{ margin: '0 auto 16px auto' }} />
          <h3>कोई सक्रिय टोकन नहीं मिला</h3>
          <p style={{ color: '#64748b', marginBottom: '20px' }}>मंडी में अपनी फसल लाने के लिए कृपया पहले स्लॉट बुक करें।</p>
          <button onClick={() => navigate('/farmer/discovery')} className="btn-primary">
            नया स्लॉट बुक करें
          </button>
        </div>
      </div>
    );
  }

  // ── Demo-only view when rain is active and no real token ─────────────────
  if (!activeToken && rainActive) {
    return (
      <div className="farmer-layout">
        <div className="farmer-header" style={{ background: 'linear-gradient(135deg, #1e3a8a, #1d4ed8)' }}>
          <div>
            <h3 style={{ margin: 0, color: '#fff', fontSize: '1.15rem' }}>🌧️ Weather Alert</h3>
            <span style={{ fontSize: '0.75rem', opacity: 0.85, color: '#bfdbfe' }}>{DEMO_FARMER.mandi}</span>
          </div>
          <button
            onClick={handleSpeakStatus}
            style={{ background: 'rgba(255,255,255,0.15)', color: '#ffb300', padding: '8px', borderRadius: '50%', border: 'none', cursor: 'pointer' }}
          >
            <Volume2 size={20} />
          </button>
        </div>

        <div className="farmer-body">
          {/* Demo farmer info card */}
          <div className="kisan-card" style={{ padding: '14px', marginBottom: '16px', border: '1px solid #fbbf24', background: '#fffbeb' }}>
            <b style={{ color: '#92400e' }}>🌾 Demo Farmer — {DEMO_FARMER.name}</b>
            <div style={{ marginTop: '6px', color: '#78350f', fontSize: '0.85rem' }}>
              Token: <b>{DEMO_FARMER.token}</b> · {DEMO_FARMER.mandi}
            </div>
            <div style={{ color: '#78350f', fontSize: '0.85rem' }}>
              Appointment: <b>{DEMO_FARMER.date} at {DEMO_FARMER.time}</b>
            </div>
          </div>

          <WeatherAlertBanner
            rainActive={rainActive}
            decision={decision}
            newSlot={newSlot}
            reschedule={reschedule}
            keepToken={keepToken}
            cancelToken={cancelToken}
            displayToken={displayToken}
          />

          {/* Demo token display */}
          {(decision === 'RESCHEDULED' || decision === 'KEPT') && (
            <div style={{
              background: 'linear-gradient(135deg, #ffffff, #fffbeb)',
              border: '3px solid #f59e0b',
              borderRadius: '20px',
              padding: '20px',
              textAlign: 'center',
              marginBottom: '20px',
            }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#b45309', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '4px' }}>
                डिजिटल ई-टोकन पास (Digital Mandi Pass)
              </div>
              <div style={{ fontSize: '2.8rem', fontWeight: 900, color: '#0d3311', margin: '8px 0' }}>
                #{DEMO_FARMER.token}
              </div>
              <div style={{ fontSize: '0.9rem', color: '#166534', fontWeight: 700, marginBottom: '14px' }}>
                {decision === 'RESCHEDULED' && newSlot
                  ? `${newSlot.date} • ${newSlot.time} — Emergency Slot`
                  : `${DEMO_FARMER.date} • ${DEMO_FARMER.time} — Original Appointment`}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '10px' }}>
                <QrCanvas qrId={activeToken?.qrId} size={100} />
              </div>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                मंडी गेट पर लगे स्कैनर पर यह QR कोड दिखाएं
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Normal view with real activeToken (+ optional demo weather alert overlay) ──
  return (
    <div className="farmer-layout">
      {/* Mobile Header */}
      <div className="farmer-header" style={showWeatherAlert && !decision ? { background: 'linear-gradient(135deg, #1e3a8a, #1d4ed8)' } : {}}>
        <div>
          <h3 style={{ margin: 0, color: '#fff', fontSize: '1.1rem' }}>
            {showWeatherAlert && !decision ? '🌧️ Weather Alert' : t('tokenGenerated')}
          </h3>
          <span style={{ fontSize: '0.72rem', opacity: 0.85 }}>{activeToken.centreName || DEMO_FARMER.mandi}</span>
        </div>
        <button
          onClick={handleSpeakStatus}
          style={{ background: 'rgba(255,255,255,0.15)', color: '#ffb300', padding: '8px', borderRadius: '50%', border: 'none', cursor: 'pointer' }}
        >
          <Volume2 size={20} />
        </button>
      </div>

      {/* Desktop Topbar */}
      <div className="farmer-desktop-topbar" style={showWeatherAlert && !decision ? { background: '#eff6ff', borderBottomColor: '#3b82f6' } : {}}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: showWeatherAlert && !decision ? '#1e3a8a' : '#0f172a', margin: 0 }}>
            {showWeatherAlert && !decision ? '🌧️ Weather Alert' : '🎟️ ' + t('tokenGenerated')}
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '2px 0 0' }}>{activeToken.centreName || DEMO_FARMER.mandi}</p>
        </div>
        <button
          onClick={handleSpeakStatus}
          style={{ background: '#f1f5f9', color: '#2e7d32', border: '1px solid #cbd5e1', padding: '8px 14px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, cursor: 'pointer' }}
        >
          <Volume2 size={16} /> सुनें
        </button>
      </div>

      <div className="farmer-body">
        {/* ── WEATHER ALERT SECTION (demo only, shown when rain active) ── */}
        {showWeatherAlert && (
          <WeatherAlertBanner
            rainActive={rainActive}
            decision={decision}
            newSlot={newSlot}
            reschedule={reschedule}
            keepToken={keepToken}
            cancelToken={cancelToken}
            displayToken={displayToken}
          />
        )}

        {/* ── WEATHER EMERGENCY BADGE (post real-booking rescheduling) ── */}
        {!showWeatherAlert && activeToken.bookingType === 'WEATHER_EMERGENCY' && (
          <div className="kisan-card" style={{ padding: '14px', marginBottom: '16px', border: '1px solid #f59e0b', background: '#fffbeb' }}>
            <b style={{ color: '#92400e' }}>🌧️ WEATHER EMERGENCY RESCHEDULED</b>
            <div style={{ marginTop: '8px', color: '#78350f', fontSize: '0.85rem' }}>Same token retained: <b>KF-{activeToken.tokenNumber?.replace(/^KF-/, '')}</b></div>
            <div style={{ marginTop: '4px', color: '#78350f', fontSize: '0.85rem' }}>New appointment: <b>{activeToken.bookingDate} at {activeToken.timeSlot}</b></div>
            {activeToken.originalDate && <div style={{ marginTop: '4px', color: '#92400e', fontSize: '0.8rem' }}>Original appointment: {activeToken.originalDate} at {activeToken.originalTime}</div>}
          </div>
        )}

        {/* ── TRAVEL BANNER ── */}
        {activeToken.travelAlertActive && (
          <div
            className="animate-pulse-glow"
            style={{
              background: 'linear-gradient(135deg, #1e3a8a, #2563eb)',
              color: '#ffffff',
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '16px',
              boxShadow: '0 8px 20px rgba(37, 99, 235, 0.35)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <div style={{ background: '#ffb300', color: '#0d3311', borderRadius: '50%', padding: '6px' }}>
                <Navigation size={18} />
              </div>
              <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#ffffff' }}>
                🔔 {t('startTravelling')}
              </h4>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#e0e7ff', margin: '0 0 12px 0', lineHeight: 1.4 }}>
              {t('startTravellingDesc')}
            </p>
            <button
              onClick={() => window.open('https://maps.google.com', '_blank')}
              style={{
                background: '#ffffff',
                color: '#1e3a8a',
                padding: '8px 16px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.85rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <Navigation size={14} /> {t('directions')}
            </button>
          </div>
        )}

        {/* ── MANDI LIVE STATUS CARD ── */}
        <div className="kisan-card" style={{ padding: '14px', marginBottom: '16px', border: '1px solid #bfdbfe', background: '#eff6ff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <b>मंडी में अभी</b>
            <span style={{ color: wsConnected ? '#15803d' : '#b45309', fontSize: '0.78rem' }}>
              {wsConnected ? '🟢 LIVE' : '🟡 Reconnecting...'}
            </span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#15803d', marginTop: '6px' }}>
            {personalQueue?.totalActiveFarmers ?? centreQueue?.activeFarmerCount ?? 0}{' '}
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>active farmers</span>
          </div>
          <b style={{ display: 'block', marginTop: '10px' }}>प्रक्रिया स्थिति (Live Process)</b>
          <div style={{ marginTop: '8px', color: '#1e3a8a', fontWeight: 700 }}>
            {(activeToken.status || 'token_generated').replaceAll('_', ' ').toUpperCase()}
          </div>
          <button
            type="button"
            onClick={refreshStatus}
            style={{ marginTop: '10px', padding: '7px 10px', border: '1px solid #93c5fd', borderRadius: '7px', background: '#fff', color: '#1e3a8a', fontWeight: 700, cursor: 'pointer' }}
          >
            स्थिति Refresh करें
          </button>
        </div>

        {/* ── HERO DIGITAL TOKEN CARD ── */}
        <div
          style={{
            background: 'linear-gradient(135deg, #ffffff, #fffbeb)',
            border: decision === 'RESCHEDULED' ? '3px solid #22c55e' : '3px solid #f59e0b',
            borderRadius: '20px',
            padding: '20px',
            boxShadow: 'var(--shadow-gold)',
            textAlign: 'center',
            position: 'relative',
            marginBottom: '20px',
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#b45309', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '4px' }}>
            डिजिटल ई-टोकन पास (Digital Mandi Pass)
          </div>

          <div style={{ fontSize: '2.8rem', fontWeight: 900, color: '#0d3311', fontFamily: 'var(--font-heading)', letterSpacing: '1px', lineHeight: 1.1, margin: '8px 0' }}>
            #{activeToken.tokenNumber}
          </div>

          <div style={{ fontSize: '0.9rem', color: '#166534', fontWeight: 700, marginBottom: '14px' }}>
            {decision === 'RESCHEDULED' && newSlot
              ? `${newSlot.date} • ${newSlot.time} — Emergency Weather Slot`
              : `${activeToken.gateNumber} • ${activeToken.timeSlot}`}
          </div>

          {/* QR Code - responsive size */}
          <div style={{
            width: '160px', height: '160px', margin: '0 auto 10px auto',
            background: '#ffffff', border: '2px solid #cbd5e1', borderRadius: '12px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '8px', boxShadow: 'inset 0 0 10px rgba(0,0,0,0.05)',
          }}>
            <QrCanvas qrId={activeToken.qrId} size={140} />
          </div>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            मंडी गेट पर लगे स्कैनर पर यह QR कोड दिखाएं
          </span>

          {/* Entry/Exit Status */}
          <MandiEntryStatus
            entryStatus={activeToken.entryStatus}
            exitStatus={activeToken.exitStatus}
            insideMandi={activeToken.insideMandi}
            entryTime={activeToken.entryTime}
            exitTime={activeToken.exitTime}
          />

          <hr style={{ border: 'none', borderTop: '1px dashed #cbd5e1', margin: '16px 0' }} />

          {/* Live Queue Telemetry Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            <div style={{ background: '#f8fafc', padding: '10px 6px', borderRadius: '10px' }}>
              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{t('currentServing')}</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#dc2626' }}>{activeToken.currentServing}</div>
            </div>
            <div style={{ background: '#f8fafc', padding: '10px 6px', borderRadius: '10px' }}>
              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{t('remainingFarmers')}</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                {personalQueue?.farmersAhead ?? activeToken.farmersRemaining ?? 0} किसान
              </div>
            </div>
            <div style={{ background: '#f8fafc', padding: '10px 6px', borderRadius: '10px' }}>
              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>अनुमानित समय (ETA)</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#16a34a' }}>~{activeToken.etaMinutes} min</div>
            </div>
            <div style={{ background: '#f8fafc', padding: '10px 6px', borderRadius: '10px', gridColumn: 'span 3' }}>
              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Queue Position</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                {personalQueue?.queuePosition ?? activeToken.queuePosition ?? '...'}
              </div>
            </div>
          </div>
        </div>

        {/* ── Action Buttons ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button onClick={() => navigate('/farmer/status-tracker')} className="btn-primary btn-full">
            <span>{t('stepperTitle')} देखें</span>
            <ArrowRight size={20} />
          </button>

          <button onClick={handleSpeakStatus} className="btn-secondary btn-full">
            <Volume2 size={18} />
            <span>टोकन स्थिति आवाज में सुनें (Listen Audio)</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TokenStatusPage;
