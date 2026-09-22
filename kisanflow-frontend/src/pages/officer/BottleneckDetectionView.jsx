import React from 'react';
import { useNavigate } from 'react-router-dom';
import { GitPullRequest, AlertOctagon, CheckCircle2, Clock, AlertTriangle, ArrowRight } from 'lucide-react';
import { useOfficer } from '../../context/OfficerContext';
import OfficerSidebar from '../../components/officer/OfficerSidebar';

const BottleneckDetectionView = () => {
  const navigate = useNavigate();
  const { centres } = useOfficer();

  const centresHealthData = [
    {
      id: 'centre-3',
      name: 'Patiala Central Yard',
      registration: { status: 'moderate', avgTime: '1.8 min', queue: 18, sla: '< 1 min' },
      weighing: { status: 'bottleneck', avgTime: '8.2 min', queue: 44, sla: '< 4 min' },
      quality: { status: 'moderate', avgTime: '4.5 min', queue: 12, sla: '< 3 min' },
      payment: { status: 'optimal', avgTime: '2.0 min', queue: 6, sla: '< 3 min' },
      criticalStage: 'Weighbridge Counter 2 (Scale Calibration Fault)',
    },
    {
      id: 'centre-1',
      name: 'Kapurthala Main Mandi',
      registration: { status: 'optimal', avgTime: '45 sec', queue: 4, sla: '< 1 min' },
      weighing: { status: 'optimal', avgTime: '3.5 min', queue: 9, sla: '< 4 min' },
      quality: { status: 'optimal', avgTime: '2.8 min', queue: 3, sla: '< 3 min' },
      payment: { status: 'optimal', avgTime: '1.5 min', queue: 2, sla: '< 3 min' },
      criticalStage: 'None (Flow Healthy)',
    },
    {
      id: 'centre-4',
      name: 'Nawan Pind Sub-Centre',
      registration: { status: 'optimal', avgTime: '55 sec', queue: 6, sla: '< 1 min' },
      weighing: { status: 'moderate', avgTime: '5.2 min', queue: 22, sla: '< 4 min' },
      quality: { status: 'bottleneck', avgTime: '7.1 min', queue: 28, sla: '< 3 min' },
      payment: { status: 'moderate', avgTime: '3.8 min', queue: 14, sla: '< 3 min' },
      criticalStage: 'Quality Testing Lab (Moisture meter shortage)',
    },
    {
      id: 'centre-2',
      name: 'Rajpura Smart Agri Hub',
      registration: { status: 'optimal', avgTime: '30 sec', queue: 2, sla: '< 1 min' },
      weighing: { status: 'optimal', avgTime: '2.5 min', queue: 4, sla: '< 4 min' },
      quality: { status: 'optimal', avgTime: '2.0 min', queue: 2, sla: '< 3 min' },
      payment: { status: 'optimal', avgTime: '1.2 min', queue: 1, sla: '< 3 min' },
      criticalStage: 'None (Optimal AI Flow)',
    },
  ];

  const renderHealthCell = (cell) => {
    const isBottleneck = cell.status === 'bottleneck';
    const isModerate = cell.status === 'moderate';

    return (
      <div
        style={{
          background: isBottleneck ? '#fee2e2' : (isModerate ? '#fef3c7' : '#dcfce7'),
          color: isBottleneck ? '#991b1b' : (isModerate ? '#92400e' : '#166534'),
          border: isBottleneck ? '1px solid #f87171' : '1px solid transparent',
          padding: '8px 12px',
          borderRadius: '8px',
          fontSize: '0.8rem',
        }}
      >
        <div style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
          {isBottleneck ? <AlertOctagon size={14} /> : (isModerate ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />)}
          <span>{cell.avgTime}</span>
        </div>
        <div style={{ fontSize: '0.7rem', opacity: 0.85, marginTop: '2px' }}>
          Queue: {cell.queue} | SLA: {cell.sla}
        </div>
      </div>
    );
  };

  return (
    <div className="officer-layout">
      <OfficerSidebar />

      <main className="officer-main">
        <header className="officer-topbar">
          <div>
            <h1 style={{ fontSize: '1.4rem', margin: 0, color: '#0f172a' }}>
              🔍 Stage-Wise Bottleneck Detection Grid
            </h1>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
              Live SLA telemetry across Registration, Weighing, Quality Assay, and Payment Settlement
            </p>
          </div>
        </header>

        <div className="officer-content">
          <div className="kisan-card" style={{ padding: '20px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '14px 16px', fontSize: '0.85rem' }}>Procurement Center</th>
                  <th style={{ padding: '14px 16px', fontSize: '0.85rem' }}>1. Gate Registration</th>
                  <th style={{ padding: '14px 16px', fontSize: '0.85rem' }}>2. Gross Weighbridge</th>
                  <th style={{ padding: '14px 16px', fontSize: '0.85rem' }}>3. Quality Assay</th>
                  <th style={{ padding: '14px 16px', fontSize: '0.85rem' }}>4. DBT Settlement</th>
                  <th style={{ padding: '14px 16px', fontSize: '0.85rem' }}>Identified Choke Point</th>
                </tr>
              </thead>
              <tbody>
                {centresHealthData.map((row) => (
                  <tr key={row.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
                      {row.name}
                    </td>
                    <td style={{ padding: '10px 16px' }}>{renderHealthCell(row.registration)}</td>
                    <td style={{ padding: '10px 16px' }}>{renderHealthCell(row.weighing)}</td>
                    <td style={{ padding: '10px 16px' }}>{renderHealthCell(row.quality)}</td>
                    <td style={{ padding: '10px 16px' }}>{renderHealthCell(row.payment)}</td>
                    <td style={{ padding: '14px 16px', fontSize: '0.85rem' }}>
                      <span
                        style={{
                          color: row.criticalStage.includes('None') ? '#16a34a' : '#dc2626',
                          fontWeight: 700,
                        }}
                      >
                        {row.criticalStage}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default BottleneckDetectionView;
