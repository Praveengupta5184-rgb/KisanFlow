import React, { useState, useEffect } from 'react';
import { QrCode, ScanLine, LogIn, LogOut, Search, Activity } from 'lucide-react';
import OfficerSidebar from '../../components/officer/OfficerSidebar';
import { officerApi } from '../../services/api';
import { useOfficer } from '../../context/OfficerContext';

const GateManagement = () => {
  const { centres, selectedCentreId, setSelectedCentreId, liveCentreQueues } = useOfficer();
  const [qrId, setQrId] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [occupancy, setOccupancy] = useState(0);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 4000); };

  // Sync occupancy from Context or fallback
  useEffect(() => {
    if (selectedCentreId && liveCentreQueues[selectedCentreId]) {
      setOccupancy(liveCentreQueues[selectedCentreId].occupancy || 0);
    }
  }, [selectedCentreId, liveCentreQueues]);

  const handleScan = async (e) => {
    e.preventDefault();
    if (!qrId.trim() || !selectedCentreId) return;

    setLoading(true);
    setScanResult(null);
    try {
      const res = await officerApi.scanQr(qrId.trim());
      setScanResult(res);
      
      if (res.event === 'GATE_ENTRY') {
        showToast(`✅ Entry Successful: ${res.farmerName} entered the mandi.`);
      } else if (res.event === 'GATE_EXIT') {
        showToast(`🚪 Exit Successful: ${res.farmerName} left the mandi.`);
      } else {
        showToast(`⚠️ QR Scanned: Event ${res.event}`);
      }
      
      if (res.currentOccupancy !== undefined) {
        setOccupancy(res.currentOccupancy);
      }
      
      setQrId('');
    } catch (err) {
      showToast('❌ Scan failed: ' + (err?.response?.data?.message || 'Invalid or expired QR.'));
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
              🚧 Gate Management
            </h1>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
              Scan Farmer QR or manually enter Token ID for Gate Entry & Exit.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <select
              value={selectedCentreId || ''}
              onChange={e => setSelectedCentreId(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 600, fontSize: '0.9rem' }}
            >
              {centres.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </header>

        <div className="officer-content" style={{ maxWidth: '800px', margin: '0 auto' }}>
          {/* Occupancy Card */}
          <div className="kisan-card" style={{ padding: '24px', textAlign: 'center', background: 'linear-gradient(135deg, #1e293b, #0f172a)', color: '#fff', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <Activity size={24} color="#38bdf8" />
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>Live Mandi Occupancy</h2>
            </div>
            <div style={{ fontSize: '3rem', fontWeight: 900, color: '#38bdf8' }}>
              {occupancy}
            </div>
            <p style={{ margin: 0, opacity: 0.8, fontSize: '0.9rem' }}>Farmers currently inside</p>
          </div>

          {/* Scanner Form */}
          <div className="kisan-card" style={{ padding: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <ScanLine size={28} color="#2563eb" />
              <h2 style={{ margin: 0, color: '#0f172a' }}>Scan QR / Enter Token</h2>
            </div>

            <form onSubmit={handleScan} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <QrCode size={20} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input
                  type="text"
                  value={qrId}
                  onChange={(e) => setQrId(e.target.value)}
                  placeholder="e.g. KFQR:5f8a... or Token ID"
                  required
                  style={{
                    width: '100%', padding: '16px 16px 16px 44px',
                    fontSize: '1.1rem', borderRadius: '12px',
                    border: '2px solid #cbd5e1', outline: 'none', boxSizing: 'border-box',
                    transition: 'border-color 0.2s'
                  }}
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '16px 32px', background: '#2563eb', color: '#fff',
                  border: 'none', borderRadius: '12px', fontSize: '1.1rem', fontWeight: 700,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                  opacity: loading ? 0.7 : 1
                }}
              >
                {loading ? 'Scanning...' : 'Process Gate'}
              </button>
            </form>

            <div style={{ marginTop: '16px', fontSize: '0.85rem', color: '#64748b' }}>
              ℹ️ The system automatically determines if this is an Entry or Exit based on the farmer's current status inside the mandi.
            </div>
          </div>

          {/* Scan Result */}
          {scanResult && (
            <div style={{
              marginTop: '24px', padding: '24px', borderRadius: '12px',
              background: scanResult.event === 'GATE_ENTRY' ? '#f0fdf4' : '#eff6ff',
              border: `1px solid ${scanResult.event === 'GATE_ENTRY' ? '#bbf7d0' : '#bfdbfe'}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                {scanResult.event === 'GATE_ENTRY' ? <LogIn size={28} color="#16a34a" /> : <LogOut size={28} color="#2563eb" />}
                <h3 style={{ margin: 0, color: scanResult.event === 'GATE_ENTRY' ? '#166534' : '#1e3a8a' }}>
                  {scanResult.event === 'GATE_ENTRY' ? 'Gate Entry Approved' : 'Gate Exit Processed'}
                </h3>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '0.95rem' }}>
                <div>
                  <div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>Farmer Name</div>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>{scanResult.farmerName}</div>
                </div>
                <div>
                  <div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>Token Number</div>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>{scanResult.token}</div>
                </div>
                <div>
                  <div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>Time</div>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>
                    {new Date(scanResult.event === 'GATE_ENTRY' ? scanResult.entryTime : scanResult.exitTime).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>Message</div>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>{scanResult.message}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px', background: '#0f172a', color: '#fff',
          padding: '14px 20px', borderRadius: '12px', fontWeight: 600, fontSize: '0.9rem',
          boxShadow: '0 10px 30px rgba(0,0,0,0.3)', zIndex: 3000,
          animation: 'slideInRight 0.3s ease-out'
        }}>
          {toast}
        </div>
      )}
    </div>
  );
};

export default GateManagement;
