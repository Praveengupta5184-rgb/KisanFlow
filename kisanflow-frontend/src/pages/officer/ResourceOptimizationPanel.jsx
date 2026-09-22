import React from 'react';
import { Users, CheckCircle2, Zap, ArrowRight, ShieldCheck, Plus, Check } from 'lucide-react';
import { useOfficer } from '../../context/OfficerContext';
import OfficerSidebar from '../../components/officer/OfficerSidebar';

const ResourceOptimizationPanel = () => {
  const { resourceSuggestions, applyResourceSuggestion } = useOfficer();

  return (
    <div className="officer-layout">
      <OfficerSidebar />

      <main className="officer-main">
        <header className="officer-topbar">
          <div>
            <h1 style={{ fontSize: '1.4rem', margin: 0, color: '#0f172a' }}>
              ⚡ AI Resource & Counter Optimization
            </h1>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
              Dynamic staffing, mobile weighbridge dispatch, and operating hour adjustments
            </p>
          </div>
        </header>

        <div className="officer-content">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
            {resourceSuggestions.map((s) => {
              const isApplied = s.status === 'applied';

              return (
                <div
                  key={s.id}
                  className="kisan-card"
                  style={{
                    border: isApplied ? '2px solid #22c55e' : '1px solid #cbd5e1',
                    background: isApplied ? '#f0fdf4' : '#ffffff',
                    padding: '20px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div>
                      <span className="badge badge-gold" style={{ marginBottom: '6px' }}>
                        🎯 Targeted Center: {s.centreName}
                      </span>
                      <h3 style={{ margin: '4px 0', fontSize: '1.15rem', color: '#0f172a' }}>
                        {s.recommendation}
                      </h3>
                    </div>

                    {isApplied ? (
                      <span className="badge badge-green">
                        <CheckCircle2 size={14} /> APPLIED & ACTIVE
                      </span>
                    ) : (
                      <button
                        onClick={() => applyResourceSuggestion(s.id)}
                        className="btn-primary"
                        style={{ width: 'auto', padding: '8px 18px', fontSize: '0.85rem', background: '#16a34a' }}
                      >
                        <Check size={16} /> Approve & Reallocate
                      </button>
                    )}
                  </div>

                  <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem', color: '#15803d', fontWeight: 600 }}>
                    💡 <b>Estimated Efficiency Impact:</b> {s.impact}
                  </div>
                </div>
              );
            })}
          </div>

          {/* District Roster Summary Table */}
          <div className="kisan-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '14px', color: '#0f172a' }}>
              📋 Field Personnel & Weighbridge Deployment Roster
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', textAlign: 'left' }}>
                  <th style={{ padding: '10px 12px' }}>Role</th>
                  <th style={{ padding: '10px 12px' }}>Total Deployed</th>
                  <th style={{ padding: '10px 12px' }}>Available in Reserve</th>
                  <th style={{ padding: '10px 12px' }}>Utilization Rate</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 700 }}>Weighbridge Scale Operators</td>
                  <td style={{ padding: '10px 12px' }}>28 Staff</td>
                  <td style={{ padding: '10px 12px' }}>4 Operators</td>
                  <td style={{ padding: '10px 12px', color: '#16a34a', fontWeight: 700 }}>88%</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 700 }}>Grain Quality & Moisture Inspectors</td>
                  <td style={{ padding: '10px 12px' }}>16 Inspectors</td>
                  <td style={{ padding: '10px 12px' }}>2 Inspectors</td>
                  <td style={{ padding: '10px 12px', color: '#16a34a', fontWeight: 700 }}>89%</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 700 }}>Unloading Palledars (Labor)</td>
                  <td style={{ padding: '10px 12px' }}>140 Laborers</td>
                  <td style={{ padding: '10px 12px' }}>25 Standby</td>
                  <td style={{ padding: '10px 12px', color: '#16a34a', fontWeight: 700 }}>85%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ResourceOptimizationPanel;
