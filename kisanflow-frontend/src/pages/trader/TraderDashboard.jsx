import React, { useState } from 'react';
import { useTrader } from '../../context/TraderContext';
import { LogOut, Gavel, Scale, FileCheck, IndianRupee, AlertCircle, Store } from 'lucide-react';
import { traderApi } from '../../services/api';


const LotCard = ({ lot, currentTraderId }) => {
  const [bidAmount, setBidAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isWinning = lot.highestBidderId === currentTraderId;
  const currentBid = lot.highestBidAmount || lot.basePrice;

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

  return (
    <div className="lot-card" style={{ 
        border: '1px solid #e2e8f0', 
        borderRadius: '8px', 
        padding: '1.5rem',
        background: isWinning ? '#f0fdf4' : '#ffffff',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, color: '#1e293b' }}>{lot.lotNumber}</h3>
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
            disabled={loading}
            required
          />
          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              background: '#2563eb', 
              color: 'white', 
              border: 'none', 
              padding: '0.5rem 1rem', 
              borderRadius: '4px', 
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 600
            }}
          >
            {loading ? 'Placing...' : 'Place Bid'}
          </button>
        </div>
      </form>
    </div>
  );
};

const TraderDashboard = () => {
  const { trader, activeLots, loadingLots, logout, wsConnected } = useTrader();

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
