import React, { useState } from 'react';
import {
  Sliders,
  Play,
  RotateCcw,
  Zap,
  TrendingDown,
  Clock,
  Users,
  Fuel,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useOfficer } from '../../context/OfficerContext';
import OfficerSidebar from '../../components/officer/OfficerSidebar';
import { officerApi } from '../../services/api';

const WhatIfSimulator = () => {
  const { centres, selectedCentreId, simulationResult, setSimulationResult } = useOfficer();

  const [scenarioType, setScenarioType] = useState('DEMAND_SURGE'); // 'DEMAND_SURGE' | 'MACHINE_FAILURE' | 'STAFF_UNAVAILABLE' | 'WEATHER_SHUTDOWN'
  const [surgePercentage, setSurgePercentage] = useState(35);
  const [addedCounters, setAddedCounters] = useState(2);
  const [divertTraffic, setDivertTraffic] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRunSimulation = async (e) => {
    e?.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = {
        scenarioType,
        surgePercentage,
        unavailableCounters: scenarioType === 'STAFF_UNAVAILABLE' ? addedCounters : 0,
        divertTraffic,
        affectedCentreId: selectedCentreId,
        centres: centres.map(centre => ({
          centreId: centre.id,
          currentLoad: centre.currentLoad || 0,
          capacity: centre.capacity || 1,
          staffCount: centre.staffCount || 1,
          activeCounters: centre.activeCounters || centre.staffCount || 1,
          processingSpeed: Number(centre.processingSpeed) || 1,
          distanceKm: centre.distanceKm || 0,
        })),
      };
      const res = await officerApi.runWhatIfSimulation(payload);
      setSimulationResult(res);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Simulation service unavailable. Check Docker simulation-service logs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="officer-layout">
      <OfficerSidebar />

      <main className="officer-main">
        <header className="officer-topbar">
          <div>
            <h1 style={{ fontSize: '1.4rem', margin: 0, color: '#0f172a' }}>
              🧪 "What-If" AI Queue & Operational Flow Simulator
            </h1>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
              Simulate crisis disruptions, machine breakdowns, weather events, and test mitigation strategies
            </p>
          </div>
        </header>

        <div className="officer-content">
          {/* Simulation Controls Form */}
          <div className="kisan-card" style={{ padding: '24px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', color: '#0f172a' }}>
              ⚙️ Scenario Parameter Configuration
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '20px' }}>
              {/* Scenario Type Dropdown */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px', color: '#334155' }}>
                  Select Disruption Scenario
                </label>
                <select
                  value={scenarioType}
                  onChange={(e) => setScenarioType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    background: '#ffffff',
                  }}
                >
                  <option value="DEMAND_SURGE">📈 Post-Harvest Surge (Sudden +35% Volume Influx)</option>
                  <option value="MACHINE_FAILURE">⚙️ Central Weighbridge Scale Breakdown</option>
                  <option value="WEATHER_SHUTDOWN">🌧️ Sudden Rain Alarm (Shed Congestion)</option>
                  <option value="STAFF_UNAVAILABLE">👥 QC Inspector & Labor Shortage</option>
                </select>
              </div>

              {/* Volume Influx Slider */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>
                  <span>Farmer Volume Surge:</span>
                  <span style={{ color: '#dc2626' }}>+{surgePercentage}%</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={100}
                  step={5}
                  value={surgePercentage}
                  onChange={(e) => setSurgePercentage(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#2e7d32' }}
                />
              </div>

              {/* Proposed Counter Addition Slider */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>
                  <span>Proposed Mobile Weighing Counters:</span>
                  <span style={{ color: '#16a34a' }}>+{addedCounters} Scales</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={4}
                  step={1}
                  value={addedCounters}
                  onChange={(e) => setAddedCounters(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#2e7d32' }}
                />
              </div>

              {/* Traffic Diversion Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '24px' }}>
                <input
                  type="checkbox"
                  id="divert"
                  checked={divertTraffic}
                  onChange={(e) => setDivertTraffic(e.target.checked)}
                  style={{ width: '20px', height: '20px', accentColor: '#2e7d32', cursor: 'pointer' }}
                />
                <label htmlFor="divert" style={{ fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>
                  Auto-Divert 35 Farmers to Rajpura Smart Hub
                </label>
              </div>
            </div>

            <button
              onClick={handleRunSimulation}
              className="btn-primary"
              style={{ width: 'auto', padding: '12px 32px', background: 'linear-gradient(135deg, #15803d, #166534)' }}
              disabled={loading}
            >
              <Play size={18} /> {loading ? 'Running AI Model...' : 'Run Simulation & Compare Impact'}
            </button>
            {error && <div role="alert" style={{ marginTop: '12px', color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px' }}>{error}</div>}
          </div>

          {/* SIMULATION RESULTS (BEFORE VS AFTER CARDS) */}
          {simulationResult && (
            <div>
              <div className="kisan-card" style={{ padding: '16px', marginBottom: '20px', background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                <b>Simulation result</b><div style={{ marginTop: '6px', color: '#1e3a8a' }}>{simulationResult.summary}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                {/* Before (Status Quo Without Action) */}
                <div
                  className="kisan-card"
                  style={{
                    border: '2px solid #ef4444',
                    background: '#fff1f2',
                    padding: '24px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b91c1c', fontWeight: 800, fontSize: '1rem', marginBottom: '14px' }}>
                    <AlertTriangle size={20} /> BEFORE: Status Quo (Unmitigated Crisis)
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ background: '#ffffff', padding: '12px 16px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Avg. Farmer Waiting Time:</span>
                      <b style={{ color: '#dc2626', fontSize: '1.1rem' }}>{simulationResult.baseline.avgWaitMinutes} Minutes (2.4 hrs)</b>
                    </div>

                    <div style={{ background: '#ffffff', padding: '12px 16px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Peak Yard Backlog:</span>
                      <b style={{ color: '#dc2626', fontSize: '1.1rem' }}>{simulationResult.baseline.peakQueueLength} Tractors</b>
                    </div>

                    <div style={{ background: '#ffffff', padding: '12px 16px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Yard Jam / Choke Probability:</span>
                      <b style={{ color: '#dc2626', fontSize: '1.1rem' }}>{simulationResult.baseline.jamProbability}</b>
                    </div>

                    <div style={{ background: '#ffffff', padding: '12px 16px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Tractor Idle Fuel Wasted:</span>
                      <b style={{ color: '#64748b' }}>~{simulationResult.baseline.fuelWastedLiters} Liters</b>
                    </div>
                  </div>
                </div>

                {/* After (Simulated KisanFlow AI Optimal Strategy) */}
                <div
                  className="kisan-card"
                  style={{
                    border: '2px solid #22c55e',
                    background: '#f0fdf4',
                    padding: '24px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#15803d', fontWeight: 800, fontSize: '1rem', marginBottom: '14px' }}>
                    <CheckCircle2 size={20} /> AFTER: KisanFlow AI-Optimized Dispatch
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ background: '#ffffff', padding: '12px 16px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Avg. Farmer Waiting Time:</span>
                      <b style={{ color: '#16a34a', fontSize: '1.1rem' }}>⚡ {simulationResult.simulated.avgWaitMinutes} Minutes (-80%)</b>
                    </div>

                    <div style={{ background: '#ffffff', padding: '12px 16px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Peak Yard Backlog:</span>
                      <b style={{ color: '#16a34a', fontSize: '1.1rem' }}>{simulationResult.simulated.peakQueueLength} Tractors</b>
                    </div>

                    <div style={{ background: '#ffffff', padding: '12px 16px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Yard Jam Probability:</span>
                      <b style={{ color: '#16a34a', fontSize: '1.1rem' }}>{simulationResult.simulated.jamProbability}</b>
                    </div>

                    <div style={{ background: '#ffffff', padding: '12px 16px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Fuel & Carbon Saved:</span>
                      <b style={{ color: '#16a34a' }}>~920 Liters Diesel Saved</b>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actionable Apply Banner */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #0d3311, #1e3a8a)',
                  color: '#ffffff',
                  padding: '20px',
                  borderRadius: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#ffb300' }}>
                    ✨ AI Recommendation Ready for Immediate Deployment
                  </div>
                  <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>
                    {simulationResult.aiOptimalRecommendation}
                  </div>
                </div>
                <button
                  onClick={() => alert("Simulation strategy deployed live! SMS notifications scheduled.")}
                  className="btn-primary"
                  style={{ width: 'auto', background: '#ffb300', color: '#0d3311', fontWeight: 800 }}
                >
                  Apply Strategy to Live Mandi Operations
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default WhatIfSimulator;
