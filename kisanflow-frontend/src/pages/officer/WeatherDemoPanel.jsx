/**
 * WeatherDemoPanel — Officer Weather Simulation Control Centre
 *
 * ⚠️  DEMO / SIMULATED WEATHER — NOT REAL WEATHER DATA
 *
 * This page lets the officer manually:
 *   1. Click START HEAVY RAIN to trigger the demo simulation
 *   2. Observe affected farmer T105 in real-time
 *   3. Monitor farmer's choice (Reschedule / Keep / Cancel)
 *   4. View updated emergency capacity
 *   5. Reset the demo for repeat demonstrations
 *
 * Rain NEVER starts automatically. All state lives in WeatherDemoContext.
 */
import React from 'react';
import {
  CloudRain, Sun, RefreshCw, AlertTriangle, CheckCircle2,
  XCircle, Clock, Users, Zap, Shield, Calendar,
} from 'lucide-react';
import OfficerSidebar from '../../components/officer/OfficerSidebar';
import { useWeatherDemo, DEMO_FARMER, DEMO_QUEUE } from '../../context/WeatherDemoContext';

// ─── Helper: status badge pill ───────────────────────────────────────────────
const Pill = ({ children, color = '#64748b', bg = '#f1f5f9' }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    padding: '3px 10px', borderRadius: '20px',
    fontSize: '0.75rem', fontWeight: 800,
    color, background: bg,
  }}>
    {children}
  </span>
);

// ─── Helper: stat card ───────────────────────────────────────────────────────
const StatCard = ({ label, value, icon, valueColor = '#0f172a' }) => (
  <div style={{
    background: '#ffffff', borderRadius: '12px', padding: '14px 16px',
    border: '1px solid #e2e8f0', textAlign: 'center',
  }}>
    <div style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: '4px' }}>{label}</div>
    <div style={{ fontSize: '1.6rem', fontWeight: 900, color: valueColor }}>{value}</div>
    {icon && <div style={{ marginTop: '4px', opacity: 0.5 }}>{icon}</div>}
  </div>
);

const WeatherDemoPanel = () => {
  const {
    rainActive, decision, newSlot,
    emergencySlots, affectedCount, rescheduledCount, keptCount, cancelledCount, events,
    startRain, resetDemo,
  } = useWeatherDemo();

  const hasActivity = rainActive || decision;

  return (
    <div className="officer-layout">
      <OfficerSidebar />

      <main className="officer-main">
        {/* ── Top Header ─────────────────────────────────────────────────── */}
        <header className="officer-topbar">
          <div>
            <h1 style={{ fontSize: '1.4rem', margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CloudRain size={24} color="#2563eb" />
              Weather Simulation – Demo Control Centre
            </h1>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0, marginTop: '2px' }}>
              ⚠️ DEMO / SIMULATED WEATHER — Not connected to real weather data. Manual trigger only.
            </p>
          </div>

          {/* Current weather status badge */}
          {rainActive ? (
            <Pill color="#fff" bg="#1d4ed8">
              <CloudRain size={13} /> HEAVY RAIN – ACTIVE (DEMO)
            </Pill>
          ) : (
            <Pill color="#166534" bg="#dcfce7">
              <Sun size={13} /> ☀️ Normal Weather
            </Pill>
          )}
        </header>

        <div className="officer-content">

          {/* ── DEMO DISCLAIMER BANNER ──────────────────────────────────── */}
          <div style={{
            background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
            border: '2px dashed #d97706',
            borderRadius: '12px', padding: '12px 18px',
            marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px',
          }}>
            <AlertTriangle size={18} color="#92400e" />
            <div>
              <strong style={{ color: '#78350f', fontSize: '0.9rem' }}>DEMO / SIMULATED WEATHER — For Hackathon Demonstration Only</strong>
              <div style={{ fontSize: '0.78rem', color: '#92400e', marginTop: '2px' }}>
                This simulation does not use real weather APIs. All data is pre-configured demo data for judge demonstration purposes.
                The rain event starts <strong>ONLY</strong> when you manually click the button below.
              </div>
            </div>
          </div>

          {/* ── MAIN SIMULATION CONTROL + DEMO FARMER ROW ──────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>

            {/* LEFT: Simulation Control */}
            <div className="kisan-card" style={{
              padding: '24px',
              border: rainActive ? '2px solid #1d4ed8' : '2px solid #e2e8f0',
              background: rainActive
                ? 'linear-gradient(135deg, #eff6ff, #dbeafe)'
                : 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
            }}>
              <h3 style={{ margin: '0 0 6px', fontSize: '1.1rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🌦️ Weather Simulation / Demo Control
              </h3>
              <p style={{ margin: '0 0 18px', fontSize: '0.8rem', color: '#475569' }}>
                Use this panel to manually trigger the weather event for the judge demonstration.
              </p>

              {/* Current weather status */}
              <div style={{
                background: rainActive ? '#1d4ed8' : '#f8fafc',
                borderRadius: '10px', padding: '14px 16px',
                marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '12px',
              }}>
                {rainActive
                  ? <CloudRain size={28} color="#93c5fd" />
                  : <Sun size={28} color="#f59e0b" />
                }
                <div>
                  <div style={{ fontSize: '0.75rem', color: rainActive ? '#bfdbfe' : '#64748b' }}>Current Weather</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: rainActive ? '#ffffff' : '#0f172a' }}>
                    {rainActive ? '🌧️ Heavy Rain (DEMO)' : '☀️ Normal'}
                  </div>
                </div>
              </div>

              {/* Rain Status indicator */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 14px', borderRadius: '8px',
                background: rainActive ? '#fee2e2' : '#f1f5f9',
                marginBottom: '20px',
              }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Rain Simulation Status</span>
                <Pill
                  color={rainActive ? '#991b1b' : '#166534'}
                  bg={rainActive ? '#fee2e2' : '#dcfce7'}
                >
                  {rainActive ? '🔴 ACTIVE' : '⚫ NOT ACTIVE'}
                </Pill>
              </div>

              {/* ACTION BUTTONS */}
              {!rainActive && (
                <button
                  id="btn-start-heavy-rain"
                  onClick={startRain}
                  style={{
                    width: '100%',
                    padding: '16px',
                    fontSize: '1.05rem',
                    fontWeight: 800,
                    background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    boxShadow: '0 4px 16px rgba(37, 99, 235, 0.4)',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(37, 99, 235, 0.5)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(37, 99, 235, 0.4)';
                  }}
                >
                  <CloudRain size={22} />
                  🌧️ START HEAVY RAIN
                </button>
              )}

              {hasActivity && (
                <button
                  id="btn-reset-weather-demo"
                  onClick={resetDemo}
                  style={{
                    width: '100%',
                    padding: '14px',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #374151, #1f2937)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    marginTop: rainActive ? '12px' : '0',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                  }}
                >
                  <RefreshCw size={18} />
                  🔄 RESET WEATHER DEMO
                </button>
              )}

              {!hasActivity && (
                <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8', marginTop: '12px' }}>
                  Click the button above to begin the demonstration
                </p>
              )}
            </div>

            {/* RIGHT: Demo Farmer Info */}
            <div className="kisan-card" style={{ padding: '24px', border: '2px solid #e2e8f0' }}>
              <h3 style={{ margin: '0 0 14px', fontSize: '1.05rem', color: '#0f172a' }}>
                🌾 Demo Farmer – Prepared Dataset
              </h3>

              {/* Farmer card */}
              <div style={{
                background: 'linear-gradient(135deg, #0d3311, #14532d)',
                borderRadius: '14px', padding: '18px', color: '#fff', marginBottom: '16px',
              }}>
                <div style={{ fontSize: '0.75rem', opacity: 0.7, marginBottom: '6px', letterSpacing: '1px' }}>
                  DEMO FARMER
                </div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800 }}>{DEMO_FARMER.name}</div>
                <div style={{ display: 'flex', gap: '20px', marginTop: '10px', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>Token</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fbbf24' }}>
                      {DEMO_FARMER.token}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>Appointment</div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#86efac' }}>
                      {DEMO_FARMER.date} • {DEMO_FARMER.time}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>Status</div>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#6ee7b7' }}>
                      {decision === 'RESCHEDULED' ? '🔄 WEATHER RESCHEDULED'
                        : decision === 'KEPT' ? '✅ KEPT ORIGINAL'
                        : decision === 'CANCELLED' ? '❌ CANCELLED'
                        : '✅ CONFIRMED'}
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: '10px', fontSize: '0.78rem', opacity: 0.7 }}>
                  📍 {DEMO_FARMER.mandi}
                </div>
              </div>

              {/* Decision result after farmer acts */}
              {decision === 'RESCHEDULED' && newSlot && (
                <div style={{
                  background: '#f0fdf4', border: '2px solid #22c55e',
                  borderRadius: '10px', padding: '14px',
                }}>
                  <div style={{ fontWeight: 800, color: '#166534', marginBottom: '6px' }}>
                    ✅ Auto-Rescheduled
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#166534' }}>
                    <div>📅 New Date: <strong>{newSlot.date}</strong></div>
                    <div>🕐 New Time: <strong>{newSlot.time}</strong></div>
                    <div>🎟️ Token: <strong>{DEMO_FARMER.token}</strong> (Same token retained)</div>
                    <div>🚨 Slot Type: <strong>Emergency Weather Slot</strong></div>
                  </div>
                </div>
              )}

              {decision === 'KEPT' && (
                <div style={{
                  background: '#eff6ff', border: '2px solid #3b82f6',
                  borderRadius: '10px', padding: '14px',
                }}>
                  <div style={{ fontWeight: 800, color: '#1d4ed8', marginBottom: '4px' }}>
                    🎟️ Original Token Retained
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#1e40af' }}>
                    Farmer chose to keep: {DEMO_FARMER.token} — {DEMO_FARMER.date} {DEMO_FARMER.time}
                  </div>
                </div>
              )}

              {decision === 'CANCELLED' && (
                <div style={{
                  background: '#fff1f2', border: '2px solid #ef4444',
                  borderRadius: '10px', padding: '14px',
                }}>
                  <div style={{ fontWeight: 800, color: '#991b1b', marginBottom: '4px' }}>
                    ❌ Token Cancelled
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#b91c1c' }}>
                    Token {DEMO_FARMER.token} has been cancelled by the farmer.
                  </div>
                </div>
              )}

              {!decision && (
                <div style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic' }}>
                  Waiting for farmer to make a choice after rain starts...
                </div>
              )}
            </div>
          </div>

          {/* ── WEATHER EVENT STATUS (shown after rain starts) ───────────── */}
          {rainActive && (
            <div className="kisan-card" style={{
              padding: '20px', marginBottom: '20px',
              border: '2px solid #1d4ed8', background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
            }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem', color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CloudRain size={20} color="#1d4ed8" /> 🌧️ Weather Event – Live Status
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                <StatCard label="Affected Farmers" value={affectedCount} valueColor="#dc2626" />
                <StatCard label="Rescheduled" value={rescheduledCount} valueColor="#16a34a" />
                <StatCard label="Kept Original" value={keptCount} valueColor="#2563eb" />
                <StatCard label="Cancelled" value={cancelledCount} valueColor="#9333ea" />
              </div>

              {/* Weather event details */}
              <div style={{
                background: '#ffffff', borderRadius: '10px', padding: '14px',
                border: '1px solid #bfdbfe', fontSize: '0.85rem',
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div><span style={{ color: '#64748b' }}>Weather Status:</span> <strong style={{ color: '#dc2626' }}>HEAVY_RAIN</strong></div>
                  <div><span style={{ color: '#64748b' }}>Rain Probability:</span> <strong>90%</strong></div>
                  <div><span style={{ color: '#64748b' }}>Intensity:</span> <strong>HEAVY</strong></div>
                  <div><span style={{ color: '#64748b' }}>Simulation:</span> <strong style={{ color: '#16a34a' }}>ACTIVE (DEMO)</strong></div>
                  <div><span style={{ color: '#64748b' }}>Affected Time:</span> <strong>{DEMO_FARMER.time}</strong></div>
                  <div><span style={{ color: '#64748b' }}>Affected Mandi:</span> <strong>{DEMO_FARMER.mandi}</strong></div>
                </div>
              </div>
            </div>
          )}

          {/* ── NORMAL QUEUE DISPLAY ─────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>

            {/* Normal Queue */}
            <div className="kisan-card" style={{ padding: '20px' }}>
              <h3 style={{ margin: '0 0 14px', fontSize: '1rem', color: '#0f172a' }}>
                📋 Normal Queue — Kisan Procurement Centre A
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {DEMO_QUEUE.filter(t => !(decision === 'RESCHEDULED' && t.isDemo)).map(t => (
                  <div key={t.token} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 12px', borderRadius: '8px',
                    background: t.isDemo
                      ? (rainActive ? '#fee2e2' : '#fefce8')
                      : '#f8fafc',
                    border: t.isDemo ? '2px solid #fbbf24' : '1px solid #e2e8f0',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ color: t.isDemo ? '#92400e' : '#0f172a', fontSize: '0.95rem' }}>
                        {t.token}
                      </strong>
                      {t.isDemo && (
                        <Pill color="#92400e" bg="#fef3c7">DEMO FARMER</Pill>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.82rem', color: '#475569' }}>{t.time}</span>
                      {t.isDemo && rainActive && !decision && (
                        <Pill color="#dc2626" bg="#fee2e2">⚠️ AFFECTED</Pill>
                      )}
                      {t.isDemo && decision === 'RESCHEDULED' && (
                        <Pill color="#166534" bg="#dcfce7">✅ RESCHEDULED</Pill>
                      )}
                      {t.isDemo && decision === 'KEPT' && (
                        <Pill color="#1d4ed8" bg="#dbeafe">🎟️ KEPT</Pill>
                      )}
                      {t.isDemo && decision === 'CANCELLED' && (
                        <Pill color="#991b1b" bg="#fee2e2">❌ CANCELLED</Pill>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {decision === 'RESCHEDULED' && (
                <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '10px', fontStyle: 'italic' }}>
                  T105 has moved to the emergency schedule. Other tokens remain unchanged.
                </p>
              )}
            </div>

            {/* Emergency Slots Capacity */}
            <div className="kisan-card" style={{ padding: '20px' }}>
              <h3 style={{ margin: '0 0 14px', fontSize: '1rem', color: '#0f172a' }}>
                🚨 Emergency Slot Capacity
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {emergencySlots.map(slot => (
                  <div key={slot.id} style={{
                    borderRadius: '10px', padding: '12px 14px',
                    border: slot.safe ? '1px solid #bbf7d0' : '1px solid #fecaca',
                    background: slot.safe ? '#f0fdf4' : '#fff1f2',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: slot.safe ? '#166534' : '#991b1b' }}>
                          {slot.label}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: slot.safe ? '#4d7c0f' : '#b91c1c', marginTop: '2px' }}>
                          Weather: {slot.weather}
                        </div>
                      </div>
                      <Pill
                        color={slot.safe ? '#166534' : '#991b1b'}
                        bg={slot.safe ? '#dcfce7' : '#fee2e2'}
                      >
                        {slot.status}
                      </Pill>
                    </div>
                    <div style={{ marginTop: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#64748b', marginBottom: '4px' }}>
                        <span>Emergency Capacity</span>
                        <span>{slot.used} / {slot.emergencyCapacity} Used</span>
                      </div>
                      <div style={{ height: '6px', borderRadius: '3px', background: '#e2e8f0', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${(slot.used / slot.emergencyCapacity) * 100}%`,
                          background: slot.safe ? '#22c55e' : '#ef4444',
                          borderRadius: '3px',
                          transition: 'width 0.5s ease',
                        }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── EVENT LOG ────────────────────────────────────────────────── */}
          {events.length > 0 && (
            <div className="kisan-card" style={{ padding: '20px', marginBottom: '20px' }}>
              <h3 style={{ margin: '0 0 14px', fontSize: '1rem', color: '#0f172a' }}>
                📋 Demo Event Log
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {events.map(evt => (
                  <div key={evt.id} style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '8px 12px', borderRadius: '8px', background: '#f8fafc',
                    border: '1px solid #e2e8f0', fontSize: '0.85rem',
                  }}>
                    <span style={{ color: '#64748b', fontSize: '0.75rem', minWidth: '60px' }}>{evt.time}</span>
                    <span style={{ color: '#0f172a' }}>{evt.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── JUDGE DEMO GUIDE ─────────────────────────────────────────── */}
          <div className="kisan-card" style={{
            padding: '20px',
            background: 'linear-gradient(135deg, #0f172a, #1e293b)', color: '#e2e8f0',
          }}>
            <h3 style={{ margin: '0 0 14px', fontSize: '1rem', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={18} color="#fbbf24" /> Judge Demo Step Guide
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { step: '1', desc: 'Show farmer dashboard → T105 confirmed at 4:00 PM', route: '/farmer/token-status' },
                { step: '2', desc: 'Return here → Show "Weather: Normal" status' },
                { step: '3', desc: 'Click 🌧️ START HEAVY RAIN (above)' },
                { step: '4', desc: 'Switch to Farmer Dashboard → weather alert appears automatically', route: '/farmer/token-status' },
                { step: '5', desc: 'Farmer clicks RESCHEDULE → system auto-books Tomorrow 10:00 AM' },
                { step: '6', desc: 'Return here → See T105 rescheduled, capacity 10→9' },
                { step: '7', desc: 'Click 🔄 RESET DEMO → repeat for other branches (KEEP / CANCEL)' },
              ].map(s => (
                <div key={s.step} style={{
                  display: 'flex', alignItems: 'flex-start', gap: '10px',
                  padding: '8px 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)',
                }}>
                  <span style={{
                    minWidth: '24px', height: '24px', borderRadius: '50%',
                    background: '#fbbf24', color: '#0f172a', fontWeight: 800,
                    fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {s.step}
                  </span>
                  <span style={{ fontSize: '0.82rem', lineHeight: 1.5 }}>{s.desc}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default WeatherDemoPanel;
