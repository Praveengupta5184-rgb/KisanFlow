import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Clock,
  ShieldCheck,
  Check,
  X,
  Zap,
  ArrowRight,
  TrendingUp,
  CloudRain,
  Sliders,
} from 'lucide-react';
import { useOfficer } from '../../context/OfficerContext';
import OfficerSidebar from '../../components/officer/OfficerSidebar';

const CrisisPredictorPanel = () => {
  const navigate = useNavigate();
  const { alerts, acceptAlert, dismissAlert } = useOfficer();

  const [countdowns, setCountdowns] = useState({});

  useEffect(() => {
    // Initialize countdowns
    const initial = {};
    alerts.forEach((a) => {
      initial[a.id] = a.countdownSeconds;
    });
    setCountdowns(initial);

    const timer = setInterval(() => {
      setCountdowns((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((key) => {
          if (next[key] > 0) next[key] -= 1;
        });
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [alerts]);

  const formatCountdown = (seconds) => {
    if (!seconds || seconds <= 0) return '00:00 (IMPACT NOW)';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="officer-layout">
      <OfficerSidebar />

      <main className="officer-main">
        <header className="officer-topbar">
          <div>
            <h1 style={{ fontSize: '1.4rem', margin: 0, color: '#0f172a' }}>
              ⚠️ AI Crisis Predictor & Early Warning Dispatch
            </h1>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
              Machine Learning Influx Forecasting • Weather Radar • Dynamic Load Rebalancing
            </p>
          </div>
          <button
            onClick={() => navigate('/officer/what-if-simulator')}
            className="btn-primary"
            style={{ padding: '8px 16px', fontSize: '0.85rem', background: '#1e3a8a' }}
          >
            <Sliders size={16} /> Test Scenarios in Simulator
          </button>
        </header>

        <div className="officer-content">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {alerts.map((alert) => {
              const isCritical = alert.severity === 'critical';
              const isAccepted = alert.status === 'accepted';
              const isDismissed = alert.status === 'dismissed';

              return (
                <div
                  key={alert.id}
                  className="kisan-card"
                  style={{
                    border: isCritical ? '2px solid #ef4444' : '2px solid #f59e0b',
                    background: isAccepted ? '#f0fdf4' : (isDismissed ? '#f8fafc' : '#ffffff'),
                    padding: '24px',
                    position: 'relative',
                    opacity: isDismissed ? 0.6 : 1,
                  }}
                >
                  {/* Top Bar with Center & Severity */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span
                        style={{
                          background: isCritical ? '#fee2e2' : '#fef3c7',
                          color: isCritical ? '#b91c1c' : '#b45309',
                          fontWeight: 800,
                          fontSize: '0.75rem',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <AlertTriangle size={14} /> {alert.severity.toUpperCase()} ALERT
                      </span>
                      <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a' }}>{alert.title}</h3>
                    </div>

                    {/* Countdown Timer */}
                    <div
                      style={{
                        background: '#0f172a',
                        color: '#ffb300',
                        padding: '6px 14px',
                        borderRadius: '8px',
                        fontWeight: 800,
                        fontSize: '0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontFamily: 'monospace',
                      }}
                    >
                      <Clock size={16} />
                      <span>Crisis Window: {formatCountdown(countdowns[alert.id])}</span>
                    </div>
                  </div>

                  {/* Impact Summary */}
                  <div style={{ fontSize: '0.9rem', color: '#334155', marginBottom: '14px', lineHeight: 1.5 }}>
                    <b>Center:</b> {alert.centreName} <br />
                    <b>Root Cause:</b> {alert.description} <br />
                    <span style={{ color: '#dc2626', fontWeight: 700 }}>
                      Predicted Queue Escalation: {alert.predictedWaitIncrease}
                    </span>
                  </div>

                  {/* AI Suggested Intervention Action Box */}
                  <div
                    style={{
                      background: 'linear-gradient(135deg, #f0fdf4, #e8f5e9)',
                      border: '1px solid #bbf7d0',
                      borderRadius: '12px',
                      padding: '14px 18px',
                      marginBottom: '16px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#166534', fontWeight: 800, fontSize: '0.9rem', marginBottom: '4px' }}>
                      <Zap size={18} color="#16a34a" /> AI Recommended Intervention
                    </div>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#15803d', fontWeight: 600 }}>
                      {alert.suggestedAction}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  {alert.status === 'pending' ? (
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => dismissAlert(alert.id)}
                        className="btn-secondary"
                        style={{ padding: '10px 18px', fontSize: '0.85rem' }}
                      >
                        <X size={16} /> Dismiss / Ignore
                      </button>

                      <button
                        onClick={() => acceptAlert(alert.id)}
                        className="btn-primary"
                        style={{ width: 'auto', padding: '10px 24px', fontSize: '0.9rem', background: '#16a34a' }}
                      >
                        <Check size={18} /> Accept & Auto-Dispatch Intervention
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: isAccepted ? '#16a34a' : '#64748b', fontWeight: 700, fontSize: '0.9rem' }}>
                      {isAccepted ? (
                        <>
                          <Check size={20} /> Intervention Dispatched (SMS Stagger Broadcast Sent to 35 Farmers)
                        </>
                      ) : (
                        <>
                          <X size={20} /> Alert Dismissed
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
};

export default CrisisPredictorPanel;
