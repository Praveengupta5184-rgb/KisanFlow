import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building,
  Users,
  Scale,
  Clock,
  AlertTriangle,
  MapPin,
  TrendingUp,
  ArrowUpRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useOfficer } from '../../context/OfficerContext';
import OfficerSidebar from '../../components/officer/OfficerSidebar';
import StatusPill from '../../components/common/StatusPill';

const DistrictCommandCentre = () => {
  const navigate = useNavigate();
  const { centres, alerts, setSelectedCentreId } = useOfficer();

  const [selectedVillageHeat, setSelectedVillageHeat] = useState(null);

  const pendingAlerts = alerts.filter((a) => a.status === 'pending');
  
  const totalCentres = centres.length || 0;
  const activeCentres = centres.filter(c => c.capacityStatus !== 'OFFLINE').length;
  const totalProcurement = centres.reduce((sum, c) => sum + (c.procuredMT || 0), 0);
  const totalTarget = centres.reduce((sum, c) => sum + (c.dailyTargetMT || 0), 0);
  const avgWaitTime = totalCentres ? Math.round(centres.reduce((sum, c) => sum + (c.estWaitMinutes || 0), 0) / totalCentres) : 0;
  const totalFarmersInQueue = centres.reduce((sum, c) => sum + (c.liveQueueCount || 0), 0);

  return (
    <div className="officer-layout">
      <OfficerSidebar />

      <main className="officer-main">
        {/* Top Header */}
        <header className="officer-topbar">
          <div>
            <h1 style={{ fontSize: '1.4rem', margin: 0, color: '#0f172a' }}>
              District Command & Crisis Operations
            </h1>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
              Live Telemetry • Geospatial Demand Heatmap • AI Queue Load Balancing
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => navigate('/officer/qr-scanner')}
              className="btn-primary"
              style={{ padding: '8px 16px', fontSize: '0.85rem', background: '#16a34a', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              📷 Scan Token QR
            </button>
            <button
              onClick={() => navigate('/officer/what-if-simulator')}
              className="btn-primary"
              style={{ padding: '8px 16px', fontSize: '0.85rem', background: '#1e3a8a' }}
            >
              <Zap size={16} /> Open What-If Simulator
            </button>
          </div>
        </header>

        <div className="officer-content">
          {/* Top KPI Metrics Ribbon */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
              marginBottom: '24px',
            }}
          >
            <div className="kisan-card" style={{ padding: '16px', marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.8rem' }}>
                <span>Active Mandis</span>
                <Building size={16} color="#2e7d32" />
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                {activeCentres} / {totalCentres} <span style={{ fontSize: '0.75rem', color: '#16a34a' }}>{totalCentres ? Math.round((activeCentres / totalCentres) * 100) : 0}% Online</span>
              </div>
            </div>

            <div className="kisan-card" style={{ padding: '16px', marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.8rem' }}>
                <span>Farmers Scheduled / Done</span>
                <Users size={16} color="#2563eb" />
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                {totalFarmersInQueue} <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>Live In Queue</span>
              </div>
            </div>

            <div className="kisan-card" style={{ padding: '16px', marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.8rem' }}>
                <span>Today's Procurement</span>
                <Scale size={16} color="#d97706" />
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                {totalProcurement.toLocaleString('en-IN')} MT <span style={{ fontSize: '0.75rem', color: '#16a34a' }}>{totalTarget ? Math.round((totalProcurement/totalTarget)*100) : 0}% Target</span>
              </div>
            </div>

            <div className="kisan-card" style={{ padding: '16px', marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.8rem' }}>
                <span>Avg. Mandi Turnaround (TAT)</span>
                <Clock size={16} color="#16a34a" />
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#16a34a', marginTop: '4px' }}>
                {avgWaitTime} Mins
              </div>
            </div>

            <div
              className="kisan-card"
              onClick={() => navigate('/officer/crisis-predictor')}
              style={{
                padding: '16px',
                marginBottom: 0,
                cursor: 'pointer',
                background: pendingAlerts.length > 0 ? '#fff1f2' : '#ffffff',
                border: pendingAlerts.length > 0 ? '1px solid #fecdd3' : '1px solid #e2e8f0',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#e11d48', fontSize: '0.8rem', fontWeight: 700 }}>
                <span>Active Crisis Predictors</span>
                <AlertTriangle size={16} />
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#e11d48', marginTop: '4px' }}>
                {pendingAlerts.length} Action Needed
              </div>
            </div>
          </div>

          {/* Main 2-Column Grid: Geospatial Heatmap + Center Live Capacity Leaderboard */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '20px', marginBottom: '24px' }}>
            {/* GIS Geospatial Demand Heatmap Simulation */}
            <div className="kisan-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', margin: 0, color: '#0f172a' }}>
                    🗺️ Geospatial Farmer Demand Heatmap
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Live GPS & FASTag vehicle tracking across agricultural feeder roads
                  </span>
                </div>
                <span className="badge badge-blue">📡 Real-Time GIS Stream</span>
              </div>

              {/* Map Canvas */}
              <div
                style={{
                  height: '340px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                  position: 'relative',
                  overflow: 'hidden',
                  padding: '20px',
                  color: '#ffffff',
                }}
              >
                {/* Background Grid Pattern */}
                <div style={{ position: 'absolute', inset: 0, opacity: 0.1, backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

                {/* Simulated Feeder Highways */}
                <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                  <path d="M 40 50 Q 180 140 320 180 T 520 280" fill="none" stroke="rgba(249, 168, 37, 0.4)" strokeWidth="3" strokeDasharray="6,6" />
                  <path d="M 60 280 Q 200 220 320 180 T 480 60" fill="none" stroke="rgba(46, 125, 50, 0.4)" strokeWidth="3" />
                </svg>

                {/* Mandi Nodes on Map */}
                <div
                  onClick={() => {
                    setSelectedCentreId('centre-2');
                    navigate('/officer/live-queue');
                  }}
                  style={{
                    position: 'absolute',
                    top: '30%',
                    right: '25%',
                    background: '#15803d',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    boxShadow: '0 0 20px rgba(34, 197, 94, 0.6)',
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: '0.8rem' }}>🟢 Rajpura Hub</div>
                  <div style={{ fontSize: '0.65rem', opacity: 0.9 }}>Load: 28% • 8 in Q</div>
                </div>

                <div
                  onClick={() => {
                    setSelectedCentreId('centre-3');
                    navigate('/officer/live-queue');
                  }}
                  className="animate-pulse-warning"
                  style={{
                    position: 'absolute',
                    bottom: '25%',
                    left: '28%',
                    background: '#b91c1c',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    boxShadow: '0 0 24px rgba(239, 68, 68, 0.8)',
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: '0.8rem' }}>🔴 Patiala Central</div>
                  <div style={{ fontSize: '0.65rem', opacity: 0.9 }}>Load: 92% • 78 in Q (Jam)</div>
                </div>

                <div
                  onClick={() => {
                    setSelectedCentreId('centre-1');
                    navigate('/officer/live-queue');
                  }}
                  style={{
                    position: 'absolute',
                    top: '20%',
                    left: '20%',
                    background: '#2e7d32',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: '0.8rem' }}>🟢 Kapurthala Main</div>
                  <div style={{ fontSize: '0.65rem', opacity: 0.9 }}>Load: 45% • 18 in Q</div>
                </div>

                {/* Village Origin Clusters */}
                <div style={{ position: 'absolute', bottom: '15px', right: '15px', background: 'rgba(15,23,42,0.85)', padding: '10px', borderRadius: '8px', border: '1px solid #334155' }}>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: '4px' }}>Highway Surge Clusters:</div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 700 }}>• Nabha (+65 Trucks)</span>
                    <span style={{ fontSize: '0.75rem', color: '#22c55e', fontWeight: 700 }}>• Bhawanigarh (+18)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Center Capacity Status Table */}
            <div className="kisan-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ fontSize: '1.1rem', margin: 0, color: '#0f172a' }}>
                  📊 Center Live Queue Telemetry
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Updated 2s ago</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {centres.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => {
                      setSelectedCentreId(c.id);
                      navigate('/officer/live-queue');
                    }}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '12px',
                      cursor: 'pointer',
                      background: '#f8fafc',
                      transition: 'background 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>{c.name}</span>
                      <StatusPill status={c.capacityStatus} waitMinutes={c.estWaitMinutes} />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#475569' }}>
                      <span>Queue: <b>{c.liveQueueCount} Farmers</b></span>
                      <span>Target: <b>{c.procuredMT} / {c.dailyTargetMT} MT</b></span>
                      <span>Active Scales: <b>{c.activeCounters}</b></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Feeder Village Demand Clusters Table */}
          <div className="kisan-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '12px', color: '#0f172a' }}>
              🌾 Village-Wise Farmer Influx & Demand Forecast
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', textAlign: 'left' }}>
                  <th style={{ padding: '10px 12px' }}>Village / Feeder Sector</th>
                  <th style={{ padding: '10px 12px' }}>Tractors En-Route</th>
                  <th style={{ padding: '10px 12px' }}>Primary Crop</th>
                  <th style={{ padding: '10px 12px' }}>Assigned Procurement Mandi</th>
                  <th style={{ padding: '10px 12px' }}>Load Severity</th>
                  <th style={{ padding: '10px 12px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
                    Real-time village influx tracking requires additional sensor integration.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DistrictCommandCentre;
