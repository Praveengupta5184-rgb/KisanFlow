import React from 'react';
import { CreditCard, AlertTriangle, Clock, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useOfficer } from '../../context/OfficerContext';
import OfficerSidebar from '../../components/officer/OfficerSidebar';

const PaymentDelayWidget = () => {
  const { paymentDelays } = useOfficer();

  return (
    <div className="officer-layout">
      <OfficerSidebar />

      <main className="officer-main">
        <header className="officer-topbar">
          <div>
            <h1 style={{ fontSize: '1.4rem', margin: 0, color: '#0f172a' }}>
              💳 DBT Payment Delay Prediction & SLA Monitor
            </h1>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
              Real-time PFMS & Banking Gateway monitoring to prevent &gt;48hr MSP settlement SLA breach
            </p>
          </div>
        </header>

        <div className="officer-content">
          <div className="kisan-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '14px', color: '#0f172a' }}>
              🚨 Flagged Farmer Direct Bank Transfers at Risk of SLA Delay
            </h3>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '12px 14px' }}>Farmer Name / Pay ID</th>
                  <th style={{ padding: '12px 14px' }}>Amount (₹)</th>
                  <th style={{ padding: '12px 14px' }}>Procurement Center</th>
                  <th style={{ padding: '12px 14px' }}>Time Elapsed</th>
                  <th style={{ padding: '12px 14px' }}>Gateway Issue Diagnostic</th>
                  <th style={{ padding: '12px 14px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {paymentDelays.map((pay) => (
                  <tr key={pay.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 14px' }}>
                      <b>{pay.farmerName}</b> <br />
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{pay.id}</span>
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 800, color: '#16a34a' }}>
                      ₹{pay.amountRs.toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '12px 14px' }}>{pay.centreName}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ color: '#dc2626', fontWeight: 700 }}>
                        {pay.timeElapsedHours} hrs
                      </span> / {pay.slaLimitHours} hrs SLA
                    </td>
                    <td style={{ padding: '12px 14px', color: '#b45309', fontWeight: 600 }}>
                      ⚠️ {pay.bankStatus}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <button
                        onClick={() => alert(`Retrying PFMS gateway handshake for ${pay.id}`)}
                        className="btn-secondary"
                        style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                      >
                        <RefreshCw size={12} /> Force Re-Trigger
                      </button>
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

export default PaymentDelayWidget;
