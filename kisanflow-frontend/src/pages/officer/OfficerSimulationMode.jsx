import React, { useState } from 'react';
import { Sliders, CheckCircle2, Zap, ArrowRight, UserCheck } from 'lucide-react';
import OfficerSidebar from '../../components/officer/OfficerSidebar';

const OfficerSimulationMode = () => {
  const [manualCounters, setManualCounters] = useState(2);
  const [manualStaff, setManualStaff] = useState(4);
  const [manualFarmersAllocated, setManualFarmersAllocated] = useState(450);

  const manualWaitTime = Math.round(180 / manualCounters * (manualFarmersAllocated / 300));
  const aiOptimalWaitTime = 24;

  return (
    <div className="officer-layout">
      <OfficerSidebar />

      <main className="officer-main">
        <header className="officer-topbar">
          <div>
            <h1 style={{ fontSize: '1.4rem', margin: 0, color: '#0f172a' }}>
              ⚖️ Officer Simulation Mode (Manual vs AI-Optimal)
            </h1>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
              Compare your custom procurement schedule side-by-side against KisanFlow AI algorithms
            </p>
          </div>
        </header>

        <div className="officer-content">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
            {/* Left: Manual Planning Form */}
            <div className="kisan-card" style={{ padding: '24px', border: '2px solid #cbd5e1' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <UserCheck size={22} color="#0284c7" />
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a' }}>
                  Officer Manual Plan
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>
                    Active Weighbridge Scales: {manualCounters}
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={4}
                    value={manualCounters}
                    onChange={(e) => setManualCounters(Number(e.target.value))}
                    style={{ width: '100%', accentColor: '#0284c7' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>
                    Quality Inspectors: {manualStaff}
                  </label>
                  <input
                    type="range"
                    min={2}
                    max={8}
                    value={manualStaff}
                    onChange={(e) => setManualStaff(Number(e.target.value))}
                    style={{ width: '100%', accentColor: '#0284c7' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>
                    Farmers Scheduled Today: {manualFarmersAllocated}
                  </label>
                  <input
                    type="range"
                    min={100}
                    max={800}
                    step={50}
                    value={manualFarmersAllocated}
                    onChange={(e) => setManualFarmersAllocated(Number(e.target.value))}
                    style={{ width: '100%', accentColor: '#0284c7' }}
                  />
                </div>
              </div>

              {/* Manual Output Scorecard */}
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Projected Average Wait Time:</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: manualWaitTime > 60 ? '#dc2626' : '#d97706' }}>
                  {manualWaitTime} Minutes
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                  Yard Congestion Risk: <b>{manualWaitTime > 60 ? 'High Risk' : 'Moderate'}</b>
                </div>
              </div>
            </div>

            {/* Right: AI-Optimal Strategy */}
            <div className="kisan-card" style={{ padding: '24px', border: '2px solid #22c55e', background: '#f0fdf4' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Zap size={22} color="#16a34a" />
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#15803d' }}>
                  ✨ KisanFlow AI-Optimal Strategy
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
                <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Dynamic Load Balancing:</span>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#166534' }}>
                    Evenly distributes 450 farmers across 3 neighboring mandis based on vehicle speed
                  </div>
                </div>

                <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Suggested Counter Setup:</span>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#166534' }}>
                    3 Scales + 1 Dedicated Fast-Track Lane for Pre-Assayed Grain
                  </div>
                </div>
              </div>

              {/* AI Output Scorecard */}
              <div style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #86efac' }}>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>AI Projected Average Wait Time:</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#16a34a' }}>
                  ⚡ {aiOptimalWaitTime} Minutes (-75% Reduction)
                </div>
                <div style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: 700, marginTop: '4px' }}>
                  Overall Throughput Gain: +48% Daily Volume
                </div>
              </div>

              <button
                onClick={() => alert("Adopted AI strategy as the active plan!")}
                className="btn-primary"
                style={{ marginTop: '20px', background: '#16a34a' }}
              >
                Adopt AI Strategy & Publish Mandi Slots
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default OfficerSimulationMode;
