import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Volume2, CheckCircle, Navigation, Info, Sparkles, ArrowLeft } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useFarmer } from '../../context/FarmerContext';
import { farmerApi } from '../../services/api';

const FarmerNotificationsPage = () => {
  const navigate = useNavigate();
  const { t, speakText } = useLanguage();
  const { notifications, markAllNotificationsRead, setActiveToken, setNotifications } = useFarmer();
  const [weatherAction, setWeatherAction] = React.useState(null);

  const handleWeatherAction = async (bookingId, action) => {
    setWeatherAction(`${bookingId}:${action}`);
    try {
      const updated = action === 'reschedule' ? await farmerApi.rescheduleWeatherBooking(bookingId)
        : action === 'keep' ? await farmerApi.keepWeatherBooking(bookingId)
        : await farmerApi.cancelWeatherBooking(bookingId);
      setActiveToken(prev => prev ? { ...prev, ...updated, tokenNumber: `KF-${updated.tokenNumber}` } : prev);
      setNotifications(prev => prev.map(item => item.weatherBookingId === bookingId ? {
        ...item,
        unread: false,
        resolved: true,
        message: action === 'reschedule' ? `Rescheduled automatically to ${updated.bookingDate} at ${updated.timeSlot}. Same token retained.` : action === 'keep' ? 'Your original token and appointment remain unchanged.' : 'Your appointment has been cancelled.'
      } : item));
    } catch (error) {
      setNotifications(prev => prev.map(item => item.weatherBookingId === bookingId ? { ...item, error: error.response?.data?.message || 'Weather action failed. Please try again.' } : item));
    } finally { setWeatherAction(null); }
  };

  return (
    <div className="farmer-layout">
      {/* Mobile Header */}
      <div className="farmer-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => navigate(-1)}
            style={{ background: 'none', color: '#fff', padding: '4px', border: 'none', cursor: 'pointer' }}
          >
            <ArrowLeft size={22} />
          </button>
          <h3 style={{ margin: 0, color: '#fff', fontSize: '1.1rem' }}>{t('notifications')}</h3>
        </div>
        <button
          onClick={markAllNotificationsRead}
          style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', padding: '6px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600, border: 'none', cursor: 'pointer' }}
        >
          सब पढ़ें
        </button>
      </div>

      {/* Desktop Topbar */}
      <div className="farmer-desktop-topbar">
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>🔔 {t('notifications')}</h1>
          <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '2px 0 0' }}>अपने सभी अलर्ट और अपडेट देखें</p>
        </div>
        <button
          onClick={markAllNotificationsRead}
          style={{ background: '#f1f5f9', color: '#2e7d32', border: '1px solid #cbd5e1', padding: '8px 14px', borderRadius: '10px', fontWeight: 600, cursor: 'pointer' }}
        >
          Mark All Read
        </button>
      </div>

      <div className="farmer-body">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {notifications.map((n) => (
            <div
              key={n.id}
              className="kisan-card"
              style={{
                borderLeft: n.unread ? '4px solid #2e7d32' : '1px solid #cbd5e1',
                background: n.unread ? '#f0fdf4' : '#ffffff',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                <h4 style={{ fontSize: '0.95rem', margin: 0, color: '#0f172a' }}>{n.title}</h4>
                <button
                  onClick={() => speakText(n.message)}
                  style={{ background: '#e8f5e9', color: '#2e7d32', padding: '4px', borderRadius: '50%' }}
                  title="Listen"
                >
                  <Volume2 size={14} />
                </button>
              </div>

              <p style={{ fontSize: '0.85rem', color: '#475569', margin: '0 0 8px 0', lineHeight: 1.4 }}>
                {n.message}
              </p>

              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                {n.time}
              </div>
              {n.weatherBookingId && !n.resolved && <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
                <button type="button" className="btn-primary" disabled={!!weatherAction} onClick={() => handleWeatherAction(n.weatherBookingId, 'reschedule')}>🔄 Reschedule</button>
                <button type="button" className="btn-secondary" disabled={!!weatherAction} onClick={() => handleWeatherAction(n.weatherBookingId, 'keep')}>🎟️ Keep Same Token</button>
                <button type="button" className="btn-secondary" disabled={!!weatherAction} onClick={() => handleWeatherAction(n.weatherBookingId, 'cancel')}>❌ Cancel</button>
              </div>}
              {n.error && <div role="alert" style={{ color: '#b91c1c', marginTop: '8px' }}>{n.error}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FarmerNotificationsPage;
