import React, { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw, AlertCircle, Wheat, Leaf, CheckCircle2 } from 'lucide-react';
import OfficerSidebar from '../../components/officer/OfficerSidebar';
import { officerApi, farmerApi } from '../../services/api';
import { useOfficer } from '../../context/OfficerContext';

const LotManagement = () => {
  const { centres, selectedCentreId, setSelectedCentreId, liveCentreQueues } = useOfficer();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Selected farmer state
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [lotData, setLotData] = useState(null);
  
  // Lot form state
  const [lotForm, setLotForm] = useState({ weight: '', price: '', grade: 'A' });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 4000); };

  const fetchBookings = useCallback(async (silent = false) => {
    if (!selectedCentreId) return;
    if (!silent) setLoading(true); setError('');
    try {
      const data = await officerApi.getActiveBookings(selectedCentreId);
      // Only show farmers that are inside the mandi and past weighing
      const eligible = data.filter(b => 
        ['quality_check', 'procurement', 'payment_processing', 'payment_released'].includes(b.status)
      );
      setBookings(eligible);
      
      // If we have a selected booking, refresh its lot data silently
      if (selectedBooking && silent) {
        const lot = await farmerApi.getLotByBooking(selectedBooking.id);
        setLotData(lot);
      }
    } catch {
      setError('Could not load eligible bookings.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [selectedCentreId, selectedBooking]);

  useEffect(() => { 
    fetchBookings(bookings.length > 0); 
  }, [fetchBookings, liveCentreQueues[selectedCentreId]?.updatedAt]);

  const selectFarmer = async (booking) => {
    setSelectedBooking(booking);
    setLotForm({ weight: booking.quantityQtl || '', price: '', grade: 'A' });
    setLotData(null);
    try {
      const lot = await farmerApi.getLotByBooking(booking.id);
      if (lot) setLotData(lot);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateLot = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const lot = await officerApi.createLot(selectedBooking.id, lotForm.weight, lotForm.price, lotForm.grade);
      setLotData(lot);
      showToast(`✅ Official Lot created for KF-${selectedBooking.tokenNumber}`);
    } catch (err) {
      showToast('❌ Lot creation failed: ' + (err?.response?.data?.message || 'Error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="officer-layout">
      <OfficerSidebar />

      <main className="officer-main">
        <header className="officer-topbar">
          <div>
            <h1 style={{ fontSize: '1.4rem', margin: 0, color: '#0f172a' }}>
              📦 Lot Management
            </h1>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
              Create official lots for farmers that have completed weighing.
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
            <button onClick={() => fetchBookings(false)} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <RefreshCw size={15} /> Refresh
            </button>
          </div>
        </header>

        <div className="officer-content" style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          
          {/* Left Side: Farmer Selection */}
          <div style={{ flex: '1 1 350px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ margin: 0, color: '#0f172a' }}>Eligible Farmers</h3>
            
            {loading && <div style={{ color: '#64748b' }}><RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> Loading...</div>}
            
            {!loading && bookings.length === 0 && (
              <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '12px', textAlign: 'center', color: '#64748b', border: '1px dashed #cbd5e1' }}>
                No farmers are currently at the quality check or procurement stage.
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {bookings.map(b => (
                <div 
                  key={b.id} 
                  onClick={() => selectFarmer(b)}
                  style={{
                    background: selectedBooking?.id === b.id ? '#eff6ff' : '#fff',
                    border: `1px solid ${selectedBooking?.id === b.id ? '#3b82f6' : '#e2e8f0'}`,
                    padding: '16px', borderRadius: '12px', cursor: 'pointer',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{b.farmerName}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>KF-{b.tokenNumber} | {b.produceQuantity} Qtl</div>
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563eb', background: '#dbeafe', padding: '4px 8px', borderRadius: '12px' }}>
                    {b.status.replace('_', ' ').toUpperCase()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Side: Lot Creation / Details */}
          <div style={{ flex: '2 1 450px' }}>
            {!selectedBooking ? (
              <div style={{ background: '#f8fafc', padding: '48px 24px', borderRadius: '12px', textAlign: 'center', color: '#64748b', border: '1px dashed #cbd5e1' }}>
                <Wheat size={48} color="#cbd5e1" style={{ margin: '0 auto 12px' }} />
                <h3>Select a Farmer</h3>
                <p>Select a farmer from the list to create or view their Lot.</p>
              </div>
            ) : (
              <div className="kisan-card" style={{ padding: '24px' }}>
                <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '24px' }}>
                  <h2 style={{ margin: 0, color: '#0f172a' }}>Farmer Details</h2>
                  <div style={{ display: 'flex', gap: '24px', marginTop: '12px', fontSize: '0.9rem' }}>
                    <div><span style={{ color: '#64748b' }}>Name:</span> <b>{selectedBooking.farmerName}</b></div>
                    <div><span style={{ color: '#64748b' }}>Token:</span> <b>KF-{selectedBooking.tokenNumber}</b></div>
                  </div>
                </div>

                {lotData ? (
                  <div>
                    <h2 style={{ margin: 0, color: '#166534', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CheckCircle2 size={24} color="#16a34a" /> Lot Created
                    </h2>
                    
                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '20px', borderRadius: '12px', marginTop: '16px', fontSize: '1rem', lineHeight: '1.8' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                          <span style={{ color: '#166534' }}>Lot Number:</span><br/> 
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <b style={{ fontSize: '1.2rem', color: '#14532d' }}>{lotData.lotNumber}</b>
                            {lotData.auctionExpiresAt && new Date() < new Date(lotData.auctionExpiresAt) && (
                              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#d97706', background: '#fef3c7', padding: '2px 8px', borderRadius: '12px' }}>
                                Expires: {Math.floor((new Date(lotData.auctionExpiresAt) - new Date()) / (1000 * 60 * 60))}h {Math.floor(((new Date(lotData.auctionExpiresAt) - new Date()) % (1000 * 60 * 60)) / (1000 * 60))}m
                              </span>
                            )}
                            {lotData.auctionExpiresAt && new Date() >= new Date(lotData.auctionExpiresAt) && (
                              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#ef4444', background: '#fee2e2', padding: '2px 8px', borderRadius: '12px' }}>
                                Expired
                              </span>
                            )}
                          </div>
                        </div>
                        <div><span style={{ color: '#166534' }}>Status:</span><br/> <b style={{ textTransform: 'uppercase' }}>{lotData.status}</b></div>
                        <div><span style={{ color: '#166534' }}>Actual Weight:</span><br/> <b>{lotData.actualWeight} Qtl</b></div>
                        <div><span style={{ color: '#166534' }}>Base Price:</span><br/> <b>₹{lotData.basePrice}/Qtl</b></div>
                        <div><span style={{ color: '#166534' }}>Quality Grade:</span><br/> <b>{lotData.qualityGrade}</b></div>
                        <div><span style={{ color: '#166534' }}>Highest Bid:</span><br/> <b>{lotData.highestBidAmount ? `₹${lotData.highestBidAmount}/Qtl` : 'None yet'}</b></div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h2 style={{ margin: 0, color: '#0f172a', marginBottom: '20px' }}>Create Official Lot</h2>
                    <form onSubmit={handleCreateLot} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <label>
                          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#374151', marginBottom: '8px' }}>⚖️ Actual Weight (Qtl)</div>
                          <input
                            type="number" step="0.01" min="1"
                            value={lotForm.weight}
                            onChange={e => setLotForm(f => ({ ...f, weight: e.target.value }))}
                            required
                            placeholder="e.g. 45.5"
                            style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }}
                          />
                        </label>
                        <label>
                          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#374151', marginBottom: '8px' }}>💰 Base Price (₹)</div>
                          <input
                            type="number" step="0.01" min="1"
                            value={lotForm.price}
                            onChange={e => setLotForm(f => ({ ...f, price: e.target.value }))}
                            required
                            placeholder="e.g. 2300"
                            style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }}
                          />
                        </label>
                      </div>
                      <label>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#374151', marginBottom: '8px' }}>🔬 Quality Grade</div>
                        <select
                          value={lotForm.grade}
                          onChange={e => setLotForm(f => ({ ...f, grade: e.target.value }))}
                          style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', boxSizing: 'border-box' }}
                        >
                          <option value="A+">Grade A+ (Premium)</option>
                          <option value="A">Grade A (Standard)</option>
                          <option value="B">Grade B (Fair)</option>
                          <option value="C">Grade C (Low)</option>
                        </select>
                      </label>
                      <button
                        type="submit"
                        disabled={saving}
                        style={{ padding: '14px', background: '#16a34a', color: '#fff', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '1rem', marginTop: '8px' }}
                      >
                        {saving ? '⏳ Creating Lot...' : '✅ Create Official Lot'}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}
          </div>

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

export default LotManagement;
