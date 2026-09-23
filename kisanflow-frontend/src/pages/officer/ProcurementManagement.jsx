import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, CheckCircle2, Wallet, PackageOpen } from 'lucide-react';
import OfficerSidebar from '../../components/officer/OfficerSidebar';
import { officerApi, farmerApi } from '../../services/api';
import { useOfficer } from '../../context/OfficerContext';

const ProcurementManagement = () => {
  const { centres, selectedCentreId, setSelectedCentreId, liveCentreQueues } = useOfficer();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Selected farmer state
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [lotData, setLotData] = useState(null);
  
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 4000); };

  const fetchBookings = useCallback(async (silent = false) => {
    if (!selectedCentreId) return;
    if (!silent) setLoading(true); setError('');
    try {
      const data = await officerApi.getActiveBookings(selectedCentreId);
      // Only show farmers that are in procurement or payment stages
      const eligible = data.filter(b => 
        ['procurement', 'payment_processing', 'payment_released'].includes(b.status)
      );
      setBookings(eligible);
      
      // If we have a selected booking, refresh its lot data silently
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

  const [pendingPayments, setPendingPayments] = useState([]);
  const fetchPendingPayments = useCallback(async () => {
    try {
      const payments = await officerApi.getPendingPayments();
      setPendingPayments(payments || []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => { 
    fetchBookings(bookings.length > 0); 
    fetchPendingPayments();
  }, [fetchBookings, fetchPendingPayments, liveCentreQueues[selectedCentreId]?.updatedAt]);

  const selectFarmer = async (booking) => {
    setSelectedBooking(booking);
    setLotData(null);
    try {
      const lot = await farmerApi.getLotByBooking(booking.id);
      if (lot) setLotData(lot);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCloseAuction = async () => {
    if (!lotData) return;
    setSaving(true);
    try {
      const lot = await officerApi.closeAuction(lotData.id);
      setLotData(lot);
      showToast(`✅ Auction closed. Status is now ${lot.status}`);
      // Also advance the farmer stage to payment_processing if not already done automatically
      if (selectedBooking.status === 'procurement') {
        const updatedBooking = await officerApi.updateBookingStatus(selectedBooking.id, { stage: 'payment_processing' });
        setSelectedBooking(updatedBooking);
        setBookings(prev => prev.map(b => b.id === updatedBooking.id ? updatedBooking : b));
      }
    } catch (err) {
      showToast('❌ Closing auction failed: ' + (err?.response?.data?.message || 'Error'));
    } finally {
      setSaving(false);
    }
  };

  const handleReleasePayment = async () => {
    if (!selectedBooking || !lotData) return;
    setSaving(true);
    try {
      const payoutAmount = lotData.highestBidAmount ? lotData.actualWeight * lotData.highestBidAmount : lotData.actualWeight * lotData.basePrice;
      await officerApi.recordPayment({
        bookingId: selectedBooking.id,
        amount: payoutAmount,
        status: 'completed',
        expectedDate: new Date().toISOString().split('T')[0],
        actualDate: new Date().toISOString().split('T')[0]
      });

      const updatedBooking = await officerApi.updateBookingStatus(selectedBooking.id, { stage: 'payment_released' });
      setSelectedBooking(updatedBooking);
      setBookings(prev => prev.map(b => b.id === updatedBooking.id ? updatedBooking : b));
      showToast(`💸 Payment Released to ${updatedBooking.farmerName}`);
    } catch (err) {
      showToast('❌ Payment release failed: ' + (err?.response?.data?.message || 'Error'));
    } finally {
      setSaving(false);
    }
  };

  const handleVerifyPayment = async (paymentId) => {
    try {
      await officerApi.officerVerifyPayment(paymentId, true, 'Verified');
      setPendingPayments(prev => prev.filter(p => p.id !== paymentId));
      showToast('✅ Payment verified successfully');
      // Also update the farmer's booking stage to payment_released
      // Assuming we need to refetch bookings
      fetchBookings();
    } catch (err) {
      showToast('❌ Verification failed: ' + (err?.response?.data?.message || 'Error'));
    }
  };

  const handleRejectPayment = async (paymentId) => {
    const reason = window.prompt('Reason for rejection:');
    if (!reason) return;
    try {
      await officerApi.officerVerifyPayment(paymentId, false, reason);
      setPendingPayments(prev => prev.filter(p => p.id !== paymentId));
      showToast('❌ Payment rejected');
    } catch (err) {
      showToast('❌ Rejection failed: ' + (err?.response?.data?.message || 'Error'));
    }
  };

  return (
    <div className="officer-layout">
      <OfficerSidebar />

      <main className="officer-main">
        <header className="officer-topbar">
          <div>
            <h1 style={{ fontSize: '1.4rem', margin: 0, color: '#0f172a' }}>
              💳 Procurement & Payment
            </h1>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
              Close auctions, verify winning bids, and process final payments.
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
            <h3 style={{ margin: 0, color: '#0f172a' }}>Farmers Awaiting Payment</h3>
            
            {loading && <div style={{ color: '#64748b' }}><RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> Loading...</div>}
            
            {!loading && bookings.length === 0 && (
              <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '12px', textAlign: 'center', color: '#64748b', border: '1px dashed #cbd5e1' }}>
                No farmers found in procurement or payment stages.
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
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>KF-{b.tokenNumber}</div>
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: b.status === 'payment_released' ? '#16a34a' : '#2563eb', background: b.status === 'payment_released' ? '#dcfce7' : '#dbeafe', padding: '4px 8px', borderRadius: '12px' }}>
                    {b.status.replace('_', ' ').toUpperCase()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Side: Action Panel */}
          <div style={{ flex: '2 1 450px' }}>
            {!selectedBooking ? (
              <div style={{ background: '#f8fafc', padding: '48px 24px', borderRadius: '12px', textAlign: 'center', color: '#64748b', border: '1px dashed #cbd5e1' }}>
                <Wallet size={48} color="#cbd5e1" style={{ margin: '0 auto 12px' }} />
                <h3>Select a Farmer</h3>
                <p>Select a farmer to process their auction closure or release payment.</p>
              </div>
            ) : (
              <div className="kisan-card" style={{ padding: '24px' }}>
                <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '24px' }}>
                  <h2 style={{ margin: 0, color: '#0f172a' }}>Procurement Details</h2>
                  <div style={{ display: 'flex', gap: '24px', marginTop: '12px', fontSize: '0.9rem' }}>
                    <div><span style={{ color: '#64748b' }}>Farmer Name:</span> <b>{selectedBooking.farmerName}</b></div>
                    <div><span style={{ color: '#64748b' }}>Token:</span> <b>KF-{selectedBooking.tokenNumber}</b></div>
                    <div><span style={{ color: '#64748b' }}>Stage:</span> <b style={{ textTransform: 'uppercase', color: '#2563eb' }}>{selectedBooking.status.replace('_', ' ')}</b></div>
                  </div>
                </div>

                {!lotData ? (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '16px', borderRadius: '12px', color: '#991b1b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <PackageOpen size={20} /> Official Lot not created yet! Please go to Lot Management.
                  </div>
                ) : (
                  <div>
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '20px', borderRadius: '12px', marginBottom: '24px', fontSize: '1rem', lineHeight: '1.8' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div><span style={{ color: '#64748b' }}>Lot Number:</span><br/> <b style={{ fontSize: '1.1rem', color: '#0f172a' }}>{lotData.lotNumber}</b></div>
                        <div><span style={{ color: '#64748b' }}>Auction Status:</span><br/> <b style={{ textTransform: 'uppercase', color: lotData.status === 'open' ? '#d97706' : '#16a34a' }}>{lotData.status}</b></div>
                        <div><span style={{ color: '#64748b' }}>Weight:</span><br/> <b>{lotData.actualWeight} Qtl</b></div>
                        <div><span style={{ color: '#64748b' }}>Base Price:</span><br/> <b>₹{lotData.basePrice}/Qtl</b></div>
                        <div><span style={{ color: '#64748b' }}>Highest Bid:</span><br/> <b style={{ color: '#059669', fontSize: '1.1rem' }}>{lotData.highestBidAmount ? `₹${lotData.highestBidAmount}/Qtl` : 'No Bids'}</b></div>
                        {lotData.highestBidAmount && (
                          <div><span style={{ color: '#64748b' }}>Total Payout:</span><br/> <b style={{ color: '#059669', fontSize: '1.1rem' }}>₹{(lotData.actualWeight * lotData.highestBidAmount).toLocaleString('en-IN')}</b></div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {lotData.status === 'open' && (
                        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '16px', borderRadius: '12px' }}>
                          <h4 style={{ margin: '0 0 8px 0', color: '#b45309' }}>Step 1: Close Auction</h4>
                          <p style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: '#92400e' }}>
                            The auction is currently open. Close it to finalize the highest bid.
                          </p>
                          <button
                            onClick={handleCloseAuction}
                            disabled={saving}
                            style={{ padding: '10px 20px', background: '#d97706', color: '#fff', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.95rem' }}
                          >
                            {saving ? '⏳ Closing...' : 'Hammer Down (Close Auction)'}
                          </button>
                        </div>
                      )}

                      {(lotData.status === 'closed' || selectedBooking.status === 'payment_processing') && (
                        <div style={{ background: '#f0fdfa', border: '1px solid #a7f3d0', padding: '16px', borderRadius: '12px' }}>
                          <h4 style={{ margin: '0 0 8px 0', color: '#065f46' }}>Step 2: Release Payment</h4>
                          <p style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: '#064e3b' }}>
                            Auction is closed. Release the payment to the farmer's account.
                          </p>
                          <button
                            onClick={handleReleasePayment}
                            disabled={saving || selectedBooking.status === 'payment_released'}
                            style={{ 
                              padding: '10px 20px', 
                              background: selectedBooking.status === 'payment_released' ? '#94a3b8' : '#059669', 
                              color: '#fff', borderRadius: '8px', border: 'none', 
                              cursor: selectedBooking.status === 'payment_released' ? 'not-allowed' : 'pointer', 
                              fontWeight: 700, fontSize: '0.95rem' 
                            }}
                          >
                            {saving ? '⏳ Processing...' : selectedBooking.status === 'payment_released' ? '✅ Payment Released' : 'Release Payment'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Officer Verification Section */}
            {pendingPayments.length > 0 && (
              <div className="kisan-card" style={{ padding: '24px', marginTop: '24px' }}>
                <h2 style={{ margin: '0 0 16px 0', color: '#0f172a' }}>Payments Awaiting Verification ({pendingPayments.length})</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {pendingPayments.map(p => (
                    <div key={p.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>Amount: ₹{p.amount}</div>
                        <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Offline Ref: <b>{p.offlineReference}</b></div>
                        <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Booking ID: {p.bookingId?.substring(0,8)}</div>
                        <div style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '4px' }}>Farmer Confirmed: {p.farmerConfirmation ? 'Yes ✅' : 'No'}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => handleVerifyPayment(p.id)} style={{ padding: '8px 16px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                          Verify
                        </button>
                        <button onClick={() => handleRejectPayment(p.id)} style={{ padding: '8px 16px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
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

export default ProcurementManagement;
