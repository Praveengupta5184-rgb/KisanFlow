import React, { useState } from 'react';
import { useTrader } from '../../context/TraderContext';
import { LogOut, Gavel, Scale, FileCheck, IndianRupee, AlertCircle, Store } from 'lucide-react';
import { traderApi } from '../../services/api';


const LotCard = ({ lot, currentTraderId }) => {
  const [bidAmount, setBidAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isWinning = lot.highestBidderId === currentTraderId || lot.winningTraderId === currentTraderId;
  const currentBid = lot.highestBidAmount || lot.basePrice;
  const isBidAccepted = lot.status === 'BID_ACCEPTED';

  const [timeLeft, setTimeLeft] = useState('');
  const [isExpired, setIsExpired] = useState(false);

  React.useEffect(() => {
    if (!lot.auctionExpiresAt) return;
    
    const updateTime = () => {
      const now = new Date();
      const expires = new Date(lot.auctionExpiresAt);
      const diff = expires - now;
      
      if (diff <= 0) {
        setTimeLeft('Expired');
        setIsExpired(true);
        return;
      }
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setTimeLeft(`${hours}h ${mins}m`);
    };
    
    updateTime();
    const timer = setInterval(updateTime, 60000);
    return () => clearInterval(timer);
  }, [lot.auctionExpiresAt]);

  const handleBid = async (e) => {
    e.preventDefault();
    setError('');
    
    const amount = parseFloat(bidAmount);
    if (isNaN(amount) || amount <= currentBid) {
      setError('Bid must be higher than current highest bid/base price');
      return;
    }

    setLoading(true);
    try {
      await traderApi.placeBid(lot.id, {
        traderId: currentTraderId,
        amount: amount
      });
      setBidAmount('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to place bid');
    } finally {
      setLoading(false);
    }
  };

  // BID_ACCEPTED — show won/lost state
  if (isBidAccepted) {
    const isWinner = isWinning;
    return (
      <div className="lot-card" style={{ 
          border: `2px solid ${isWinner ? '#22c55e' : '#e2e8f0'}`, 
          borderRadius: '8px', 
          padding: '1.5rem',
          background: isWinner ? '#f0fdf4' : '#f8fafc',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
          <h3 style={{ margin: 0, color: '#1e293b' }}>{lot.lotNumber}</h3>
          {isWinner ? (
            <span style={{ background: '#22c55e', color: 'white', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.875rem', fontWeight: 600 }}>🏆 You Won</span>
          ) : (
            <span style={{ background: '#94a3b8', color: 'white', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.875rem', fontWeight: 600 }}>Closed</span>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ color: '#475569' }}>Weight: <strong>{lot.actualWeight} Qtl</strong></div>
          <div style={{ color: '#475569' }}>Accepted: <strong style={{ color: '#16a34a' }}>₹{lot.highestBidAmount}</strong></div>
        </div>

        {isWinner ? (
          <div style={{ background: 'linear-gradient(135deg, #16a34a, #059669)', color: 'white', borderRadius: '8px', padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '4px' }}>🎉 Farmer accepted your bid!</div>
            <div style={{ fontSize: '0.85rem', opacity: 0.9, marginBottom: '12px' }}>
              Total due: ₹{lot.highestBidAmount && lot.actualWeight ? (lot.highestBidAmount * lot.actualWeight).toLocaleString('en-IN') : '—'}
            </div>
            <div style={{ fontSize: '0.8rem', opacity: 0.85 }}>✅ Payment details will appear in Payments section below ↓</div>
          </div>
        ) : (
          <div style={{ background: '#f1f5f9', borderRadius: '8px', padding: '1rem', textAlign: 'center', color: '#64748b' }}>
            ❌ Auction finalized — another bid was accepted by the farmer.
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="lot-card" style={{ 
        border: '1px solid #e2e8f0', 
        borderRadius: '8px', 
        padding: '1.5rem',
        background: isWinning ? '#f0fdf4' : '#ffffff',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h3 style={{ margin: 0, color: '#1e293b' }}>{lot.lotNumber}</h3>
          {timeLeft && (
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: isExpired ? '#ef4444' : '#d97706', background: isExpired ? '#fee2e2' : '#fef3c7', padding: '2px 8px', borderRadius: '12px' }}>
              ⏳ {timeLeft}
            </span>
          )}
        </div>
        {isWinning ? (
          <span style={{ background: '#22c55e', color: 'white', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.875rem', fontWeight: 600 }}>Winning</span>
        ) : lot.highestBidderId ? (
          <span style={{ background: '#ef4444', color: 'white', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.875rem', fontWeight: 600 }}>Outbid</span>
        ) : (
          <span style={{ background: '#3b82f6', color: 'white', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.875rem', fontWeight: 600 }}>Open</span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#475569' }}>
          <Scale size={18} />
          <span>Weight: <strong>{lot.actualWeight} Qtl</strong></span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#475569' }}>
          <FileCheck size={18} />
          <span>Quality: <strong>{lot.qualityGrade || 'N/A'}</strong></span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#475569' }}>
          <IndianRupee size={18} />
          <span>Base Price: <strong>₹{lot.basePrice}</strong></span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: lot.highestBidderId ? '#2563eb' : '#475569' }}>
          <Gavel size={18} />
          <span>Current Bid: <strong>₹{currentBid}</strong></span>
        </div>
      </div>

      <form onSubmit={handleBid} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {error && <div style={{ color: '#ef4444', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><AlertCircle size={14}/> {error}</div>}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="number"
            step="0.01"
            placeholder={`Min bid: ₹${(parseFloat(currentBid) + 1).toFixed(2)}`}
            value={bidAmount}
            onChange={(e) => setBidAmount(e.target.value)}
            style={{ flex: 1, padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
            disabled={loading || isExpired}
            required
          />
          <button 
            type="submit" 
            disabled={loading || isExpired}
            style={{ 
              background: isExpired ? '#94a3b8' : '#2563eb', 
              color: 'white', 
              border: 'none', 
              padding: '0.5rem 1rem', 
              borderRadius: '4px', 
              cursor: (loading || isExpired) ? 'not-allowed' : 'pointer',
              fontWeight: 600
            }}
          >
            {loading ? 'Placing...' : isExpired ? 'Expired' : 'Place Bid'}
          </button>
        </div>
      </form>
    </div>
  );
};


const PaymentCard = ({ payment }) => {
  const [offlineRef, setOfflineRef] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  const handleSubmitOffline = async (e) => {
    e.preventDefault();
    if (!offlineRef) return;
    setSubmitting(true);
    try {
      await traderApi.submitOfflinePayment({
        paymentId: payment.id,
        offlineReference: offlineRef,
        remarks: 'Submitted by trader'
      });
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit payment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.5rem', background: '#fff', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
        <h3 style={{ margin: 0, color: '#1e293b' }}>Payment for Lot</h3>
        <span style={{ 
          background: payment.status === 'INITIATED' ? '#fef08a' : payment.status.includes('PENDING') ? '#bfdbfe' : '#bbf7d0', 
          color: '#1e293b', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.875rem', fontWeight: 600 
        }}>
          {payment.status}
        </span>
      </div>
      <div style={{ marginBottom: '1rem', color: '#475569' }}>
        <p style={{ margin: '0 0 0.5rem 0' }}>Amount Due: <strong style={{ color: '#0f172a', fontSize: '1.1rem' }}>₹{payment.amount}</strong></p>
        <p style={{ margin: '0' }}>Booking ID: {payment.bookingId?.substring(0,8)}</p>
      </div>

      {payment.status === 'PAYMENT_REQUIRED' && (
        <div style={{ marginTop: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <button
              onClick={async () => {
                try {
                  setSubmitting(true);
                  await traderApi.initiateOnlinePayment({ 
                    lotId: payment.lotId,
                    amount: payment.amount,
                    paymentMethod: 'UPI',
                    paymentType: 'TRADER_TO_FARMER'
                  });
                  alert('Redirecting to payment gateway...');
                  setTimeout(async () => {
                    try {
                      await traderApi.completeOnlinePayment(payment.id);
                      alert('Online payment successful!');
                    } catch(e) {
                      alert('Payment completion failed: ' + (e.response?.data?.message || e.message));
                    }
                  }, 2000);
                } catch(e) {
                  alert(e.response?.data?.message || 'Failed to initiate online payment');
                } finally {
                  setSubmitting(false);
                }
              }}
              style={{ flex: 1, background: '#10b981', color: 'white', border: 'none', padding: '0.75rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
              disabled={submitting}
            >
              📱 Pay Online Now
            </button>
          </div>
          
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
            <form onSubmit={handleSubmitOffline} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>Or Submit Offline Payment Details</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="text" 
                  placeholder="UTR / Ref Number" 
                  value={offlineRef}
                  onChange={e => setOfflineRef(e.target.value)}
                  style={{ flex: 1, padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                  required
                />
                <button 
                  type="submit" 
                  disabled={submitting}
                  style={{ background: '#2563eb', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: submitting ? 'not-allowed' : 'pointer', fontWeight: 600 }}
                >
                  {submitting ? 'Submitting...' : 'Submit Offline'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {(payment.status === 'SUCCESS' || payment.status === 'VERIFIED_SUCCESS' || payment.status === 'completed') && (
        <div style={{ marginTop: '1rem' }}>
          <button
            onClick={() => {
              const html = `
                <html>
                  <head>
                    <title>Payment Receipt</title>
                    <style>
                      body { font-family: sans-serif; padding: 2rem; }
                      .receipt { border: 2px solid #22c55e; border-radius: 8px; padding: 2rem; max-width: 500px; margin: 0 auto; }
                      h2 { color: #166534; text-align: center; }
                      .row { display: flex; justify-content: space-between; margin-bottom: 1rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.5rem; }
                    </style>
                  </head>
                  <body>
                    <div class="receipt">
                      <h2>KisanFlow Official Receipt</h2>
                      <div class="row"><span>Payment ID:</span> <strong>${payment.id}</strong></div>
                      <div class="row"><span>Amount Paid:</span> <strong style="color: #16a34a; font-size: 1.2rem;">₹${payment.amount}</strong></div>
                      <div class="row"><span>Status:</span> <strong>${payment.status}</strong></div>
                      <div class="row"><span>Booking ID:</span> <strong>${payment.bookingId}</strong></div>
                      <div class="row"><span>Date:</span> <strong>${new Date(payment.updatedAt || payment.createdAt).toLocaleString()}</strong></div>
                      <div style="text-align: center; margin-top: 2rem; color: #64748b; font-size: 0.8rem;">Thank you for using KisanFlow!</div>
                    </div>
                    <script>window.print();</script>
                  </body>
                </html>
              `;
              const win = window.open('', '_blank');
              win.document.write(html);
              win.document.close();
            }}
            style={{ background: '#10b981', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, width: '100%' }}
          >
            🖨️ Print Receipt
          </button>
        </div>
      )}
    </div>
  );
};

const TraderDashboard = () => {
  const { trader, activeLots, loadingLots, payments, loadingPayments, logout, wsConnected } = useTrader();

  const pendingPayments = payments?.filter(p => 
    p.status === 'PAYMENT_REQUIRED' || 
    p.status === 'INITIATED' || 
    p.status === 'PROCESSING' ||
    p.status.includes('PENDING')
  ) || [];
  const completedPayments = payments?.filter(p => p.status === 'SUCCESS' || p.status === 'VERIFIED_SUCCESS' || p.status === 'completed') || [];

  return (
    <div className="dashboard-container" style={{ background: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header className="dashboard-header" style={{ background: '#1e293b', color: 'white', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Store size={28} color="#60a5fa" />
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Live Auction Board</h1>
          <span style={{ background: wsConnected ? '#22c55e' : '#ef4444', color: 'white', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 }}>
            {wsConnected ? 'Live' : 'Offline'}
          </span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 600 }}>{trader?.username}</div>
            <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Trader ID: {trader?.traderId?.substring(0,8)}</div>
          </div>
          <button onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#334155', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer' }}>
            <LogOut size={18} /> Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ padding: '2rem', flex: 1 }}>
        {pendingPayments.length > 0 && (
          <div style={{ marginBottom: '3rem' }}>
            <h2 style={{ margin: '0 0 1.5rem 0', color: '#0f172a' }}>Pending Payments ({pendingPayments.length})</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
              {pendingPayments.map(payment => (
                <PaymentCard key={payment.id} payment={payment} />
              ))}
            </div>
          </div>
        )}

        {completedPayments.length > 0 && (
          <div style={{ marginBottom: '3rem' }}>
            <h2 style={{ margin: '0 0 1.5rem 0', color: '#0f172a' }}>Completed Payments ({completedPayments.length})</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
              {completedPayments.map(payment => (
                <PaymentCard key={payment.id} payment={payment} />
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2 style={{ margin: 0, color: '#0f172a' }}>Active Lots ({activeLots.length})</h2>
          <div style={{ color: '#475569', fontSize: '0.875rem' }}>
            Centre ID: <strong>{trader?.centreId?.substring(0,8)}</strong>
          </div>
        </div>

        {loadingLots ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Loading active lots...</div>
        ) : activeLots.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'white', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
            <Gavel size={48} color="#94a3b8" style={{ marginBottom: '1rem' }} />
            <h3 style={{ margin: 0, color: '#475569' }}>No lots available for bidding</h3>
            <p style={{ color: '#64748b' }}>Waiting for officers to verify and open new lots...</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
            {activeLots.map(lot => (
              <LotCard key={lot.id} lot={lot} currentTraderId={trader.traderId} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default TraderDashboard;
