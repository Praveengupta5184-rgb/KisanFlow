import React from 'react';
import { ShieldAlert, CheckCircle2, Search, FileText } from 'lucide-react';
import { useOfficer } from '../../context/OfficerContext';
import OfficerSidebar from '../../components/officer/OfficerSidebar';

const FraudRiskPanel = () => {
  const { flaggedTransactions } = useOfficer();

  return (
    <div className="officer-layout">
      <OfficerSidebar />

      <main className="officer-main">
        <header className="officer-topbar">
          <div>
            <h1 style={{ fontSize: '1.4rem', margin: 0, color: '#0f172a' }}>
              🛡️ Anomaly & Yield Variance Verification Panel
            </h1>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
              AI audit stream for land-yield reconciliation and duplicate token checks (Non-Accusatory Protocol)
            </p>
          </div>
        </header>

        <div className="officer-content">
          <div className="kisan-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '14px', color: '#0f172a' }}>
              Transactions Flagged for Manual Verification
            </h3>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '12px 14px' }}>Transaction ID</th>
                  <th style={{ padding: '12px 14px' }}>Farmer Name</th>
                  <th style={{ padding: '12px 14px' }}>Claimed Quantity</th>
                  <th style={{ padding: '12px 14px' }}>Land Record Benchmark</th>
                  <th style={{ padding: '12px 14px' }}>Verification Reason</th>
                  <th style={{ padding: '12px 14px' }}>Status Tag</th>
                  <th style={{ padding: '12px 14px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {flaggedTransactions.map((tx) => (
                  <tr key={tx.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 700 }}>{tx.id}</td>
                    <td style={{ padding: '12px 14px' }}>{tx.farmerName}</td>
                    <td style={{ padding: '12px 14px', fontWeight: 800 }}>{tx.claimedQuantityQtl} Quintals</td>
                    <td style={{ padding: '12px 14px', color: '#64748b' }}>
                      {tx.verifiedLandSizeAcres ? `${tx.verifiedLandSizeAcres} Acres (Max ~${tx.expectedMaxYieldQtl} Qtl)` : 'Cross-Mandi Check'}
                    </td>
                    <td style={{ padding: '12px 14px', color: '#b45309', fontWeight: 600 }}>
                      {tx.flagType}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span
                        style={{
                          background: '#fef3c7',
                          color: '#92400e',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          border: '1px solid #fcd34d',
                        }}
                      >
                        {tx.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <button
                        onClick={() => alert(`Opening land record documents for ${tx.farmerName}`)}
                        className="btn-secondary"
                        style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                      >
                        <FileText size={14} /> Review Land Records
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

export default FraudRiskPanel;
