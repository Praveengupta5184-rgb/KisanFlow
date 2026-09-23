import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Clock, Circle, ArrowRight, Download, ShieldCheck, Volume2, Sparkles, Building2, AlertCircle, Gavel, TrendingUp, Zap } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useFarmer } from '../../context/FarmerContext';
import { farmerApi } from '../../services/api';

// ── Live Auction Panel ─────────────────────────────────────────────────────────
const LiveAuctionPanel = ({ lotData, onAccepted }) => {
  const [accepting, setAccepting] = React.useState(false);
  const [timeLeft, setTimeLeft] = React.useState('');

  // Live countdown timer
  React.useEffect(() => {
    if (!lotData?.auctionExpiresAt) return;
    const update = () => {
      const diff = new Date(lotData.auctionExpiresAt) - new Date();
      if (diff <= 0) { setTimeLeft('नीलामी समाप्त'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setTimeLeft(`${h}h ${m}m बाकी`);
    };
    update();
    const t = setInterval(update, 30000);
    return () => clearInterval(t);
  }, [lotData?.auctionExpiresAt]);

  const isOpen = lotData.status === 'open' || lotData.status === 'closed';
  const isAccepted = lotData.status === 'BID_ACCEPTED';
  const hasBid = lotData.highestBidAmount && lotData.highestBidId;

  // BID_ACCEPTED state
  if (isAccepted) {
    return (
      <div style={{ background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)', border: '2px solid #22c55e', borderRadius: '16px', padding: '20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <CheckCircle2 size={28} color="#16a34a" />
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#15803d' }}>✅ बोली स्वीकार की गई!</div>
            <div style={{ fontSize: '0.82rem', color: '#166534' }}>Bid Accepted — Payment Awaited</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.9rem' }}>
          <div style={{ background: '#fff', borderRadius: '10px', padding: '10px 14px' }}>
            <div style={{ color: '#64748b', fontSize: '0.75rem' }}>स्वीकृत बोली राशि</div>
            <div style={{ fontWeight: 800, fontSize: '1.3rem', color: '#059669' }}>₹{lotData.highestBidAmount}/Q</div>
          </div>
          <div style={{ background: '#fff', borderRadius: '10px', padding: '10px 14px' }}>
            <div style={{ color: '#64748b', fontSize: '0.75rem' }}>कुल भुगतान (Total)</div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#059669' }}>
              ₹{lotData.highestBidAmount && lotData.actualWeight ? (lotData.highestBidAmount * lotData.actualWeight).toLocaleString('en-IN') : '—'}
            </div>
          </div>
        </div>
        <div style={{ marginTop: '12px', background: '#fff8', borderRadius: '10px', padding: '10px 14px', fontSize: '0.85rem', color: '#166534' }}>
          🔔 व्यापारी को भुगतान की सूचना दे दी गई है। भुगतान होने पर आपको तुरंत सूचना मिलेगी।
        </div>
      </div>
    );
  }

  // LIVE / CLOSED state — show Accept button
  return (
    <div style={{
      background: isOpen && lotData.status === 'open'
        ? 'linear-gradient(135deg, #fefce8, #fef9c3)'
        : 'linear-gradient(135deg, #fef2f2, #fee2e2)',
      border: `2px solid ${lotData.status === 'open' ? '#f59e0b' : '#f87171'}`,
      borderRadius: '16px', padding: '20px', marginBottom: '20px'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Gavel size={22} color={lotData.status === 'open' ? '#d97706' : '#dc2626'} />
          <div>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>
              {lotData.status === 'open' ? '🔴 LIVE नीलामी' : '⏰ नीलामी समाप्त'}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{lotData.lotNumber}</div>
          </div>
        </div>
        {lotData.status === 'open' && timeLeft && (
          <span style={{ background: '#fef3c7', color: '#b45309', fontWeight: 700, fontSize: '0.75rem', padding: '4px 10px', borderRadius: '20px', border: '1px solid #fde68a' }}>
            ⏳ {timeLeft}
          </span>
        )}
      </div>

      {/* Lot Info */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
        <div style={{ background: '#fff8', borderRadius: '10px', padding: '10px' }}>
          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>वजन (Weight)</div>
          <div style={{ fontWeight: 700 }}>{lotData.actualWeight} क्विंटल</div>
        </div>
        <div style={{ background: '#fff8', borderRadius: '10px', padding: '10px' }}>
          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>आधार मूल्य (Base)</div>
          <div style={{ fontWeight: 700 }}>₹{lotData.basePrice}/Q</div>
        </div>
      </div>

      {/* Current Highest Bid — the star of the show */}
      <div style={{ background: hasBid ? 'linear-gradient(135deg, #064e3b, #065f46)' : '#f1f5f9', borderRadius: '12px', padding: '16px', marginBottom: '16px', textAlign: 'center' }}>
        {hasBid ? (
          <>
            <div style={{ fontSize: '0.75rem', color: '#6ee7b7', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '4px' }}>
              <TrendingUp size={12} style={{ display: 'inline', marginRight: '4px' }} />
              वर्तमान सर्वोच्च बोली
            </div>
            <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#34d399', letterSpacing: '-1px' }}>
              ₹{lotData.highestBidAmount}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#a7f3d0' }}>प्रति क्विंटल</div>
            <div style={{ fontSize: '0.82rem', color: '#6ee7b7', marginTop: '4px' }}>
              कुल: ₹{(lotData.highestBidAmount * lotData.actualWeight).toLocaleString('en-IN')}
            </div>
          </>
        ) : (
          <div style={{ color: '#94a3b8', padding: '8px 0' }}>
            <Gavel size={20} style={{ marginBottom: '4px' }} /><br />
            अभी कोई बोली नहीं। व्यापारियों की प्रतीक्षा...
          </div>
        )}
      </div>

      {/* THE ACCEPT BUTTON — most prominent element */}
      {hasBid ? (
        <button
          onClick={async () => {
            if (!window.confirm(`क्या आप ₹${lotData.highestBidAmount}/क्विंटल पर फसल बेचने के लिए सहमत हैं?\n\nYes = Bid accepted immediately. No new bids after this.`)) return;
            setAccepting(true);
            try {
              await farmerApi.acceptBid(lotData.highestBidId);
              if (onAccepted) onAccepted();
            } catch (e) {
              alert('बोली स्वीकार करने में त्रुटि: ' + (e.response?.data?.message || e.message));
            } finally {
              setAccepting(false);
            }
          }}
          disabled={accepting}
          style={{
            width: '100%',
            padding: '16px',
            background: accepting ? '#94a3b8' : 'linear-gradient(135deg, #16a34a, #059669)',
            color: '#fff',
            border: 'none',
            borderRadius: '12px',
            fontWeight: 900,
            fontSize: '1.1rem',
            cursor: accepting ? 'not-allowed' : 'pointer',
            boxShadow: accepting ? 'none' : '0 4px 15px rgba(22,163,74,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            transition: 'all 0.2s'
          }}
        >
          {accepting ? (
            <>⏳ स्वीकार हो रहा है...</>
          ) : (
            <><Zap size={20} /> ₹{lotData.highestBidAmount}/Q पर अभी स्वीकार करें</>
          )}
        </button>
      ) : (
        <div style={{ textAlign: 'center', padding: '12px', color: '#94a3b8', fontSize: '0.85rem', border: '1px dashed #cbd5e1', borderRadius: '10px' }}>
          बोली आने पर यहाँ Accept बटन दिखेगा
        </div>
      )}

      {hasBid && (
        <div style={{ marginTop: '10px', fontSize: '0.75rem', color: '#78350f', textAlign: 'center' }}>
          ⚡ नीलामी के समाप्त होने की प्रतीक्षा जरूरी नहीं — अभी स्वीकार करें
        </div>
      )}
    </div>
  );
};

const ProcurementTrackerPage = () => {
  const navigate = useNavigate();
  const { t, speakText } = useLanguage();
  const { activeToken, lotUpdate, auctionUpdate, paymentStatus, farmerPayments, setFarmerPayments } = useFarmer();
  const [lotData, setLotData] = React.useState(null);

  // Merge live WebSocket lot update into lotData
  React.useEffect(() => {
    if (lotUpdate) setLotData(prev => prev ? { ...prev, ...lotUpdate } : lotUpdate);
  }, [lotUpdate]);

  // Merge live auction update into lotData (fallback if BID_UPDATED payload is a BidResponse not LotResponse)
  React.useEffect(() => {
    if (!auctionUpdate) return;
    setLotData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        // If auctionUpdate is a LotResponse (has lotNumber) use it fully, else just update bid fields
        ...(auctionUpdate.lotNumber ? auctionUpdate : {
          highestBidAmount: auctionUpdate.amount ?? auctionUpdate.highestBidAmount ?? prev.highestBidAmount,
          highestBidId: auctionUpdate.id ?? auctionUpdate.highestBidId ?? prev.highestBidId,
          status: auctionUpdate.event === 'BID_ACCEPTED' ? 'BID_ACCEPTED'
                : auctionUpdate.event === 'AUCTION_CLOSED' ? 'closed' : prev.status,
        }),
      };
    });
  }, [auctionUpdate]);

  const STAGE_ORDER = ['token_generated', 'arrived', 'weighing', 'quality_check', 'procurement', 'payment_processing', 'payment_released'];
  const currentStatusIndex = activeToken?.status ? Math.max(1, STAGE_ORDER.indexOf(activeToken.status) + 1) : 1;
  const currentStep = currentStatusIndex;

  React.useEffect(() => {
    if (activeToken?.id && !lotData) {
      farmerApi.getLotByBooking(activeToken.id)
        .then(lot => { if (lot) setLotData(lot); })
        .catch(console.error);
    }
  }, [activeToken?.id]);

  const steps = [
    { id: 1, title: t('step1'), desc: 'गेट पर ई-टोकन QR स्कैन एवं सुरक्षा जांच', time: activeToken?.arrivalDate ? new Date(activeToken.arrivalDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Pending', icon: '🎫' },
    { id: 2, title: t('step2'), desc: 'धर्मकांटा सकल वजन (Gross Weight)', time: currentStep > 1 ? 'Complete' : 'Pending', icon: '⚖️' },
    { id: 3, title: t('step3'), desc: 'नमी परीक्षण एवं ग्रेडिंग (Quality & Grading)', time: currentStep > 2 ? 'Complete' : 'Pending', icon: '🔬' },
    { id: 4, title: t('step4'), desc: 'फसल खाली कर शुद्ध वजन (Net Weight)', time: currentStep > 3 ? 'Complete' : 'Pending', icon: '🌾' },
    { id: 5, title: t('step5'), desc: 'J-Form रसीद एवं दस्तावेज़ीकरण', time: currentStep > 4 ? 'Complete' : 'Pending', icon: '📜' },
    { id: 6, title: t('step6'), desc: 'DBT राशि ट्रांसफर प्रक्रिया', time: currentStep > 5 ? 'Complete' : 'Pending', icon: '🏦' },
  ];

  const handleAudioSummary = () => {
    const currentStepObj = steps[currentStep - 1] || steps[0];
    speakText(`वर्तमान चरण ${currentStep} है: ${currentStepObj.title}. ${currentStepObj.desc}`);
  };

  return (
    <div className="farmer-layout">
      {/* Mobile Header */}
      <div className="farmer-header">
        <div>
          <h3 style={{ margin: 0, color: '#fff', fontSize: '1.1rem' }}>{t('stepperTitle')}</h3>
          <span style={{ fontSize: '0.72rem', opacity: 0.85 }}>टोकन #{activeToken?.tokenNumber}</span>
        </div>
        <button onClick={handleAudioSummary} style={{ background: 'rgba(255,255,255,0.15)', color: '#ffb300', padding: '8px', borderRadius: '50%', border: 'none', cursor: 'pointer' }}>
          <Volume2 size={20} />
        </button>
      </div>

      {/* Desktop Topbar */}
      <div className="farmer-desktop-topbar">
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>🌾 {t('stepperTitle')}</h1>
          <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '2px 0 0' }}>टोकन #{activeToken?.tokenNumber} — खरीद यात्रा</p>
        </div>
        <button onClick={handleAudioSummary} style={{ background: '#f1f5f9', color: '#2e7d32', border: '1px solid #cbd5e1', padding: '8px 14px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, cursor: 'pointer' }}>
          <Volume2 size={16} /> सुनें
        </button>
      </div>

      <div className="farmer-body">
        {/* Token Info Strip */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '12px 16px', borderRadius: '12px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>खरीद केंद्र</div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>{activeToken?.centreName || '---'}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>मात्रा (अनुमानित)</div>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: '#16a34a' }}>{activeToken?.quantityQtl || 0} क्विंटल</div>
          </div>
        </div>

        {/* Officer instructions */}
        {(activeToken?.nextProcess || activeToken?.officerInstruction) && (
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
            <h4 style={{ margin: '0 0 8px', color: '#1d4ed8', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} /> अधिकारी के निर्देश
            </h4>
            {activeToken?.nextProcess && <div style={{ fontSize: '0.9rem', color: '#1e40af', marginBottom: '4px' }}><strong>अगला:</strong> {activeToken.nextProcess}{activeToken?.nextCounter && ` (Counter ${activeToken.nextCounter})`}</div>}
            {activeToken?.officerInstruction && <div style={{ fontSize: '0.9rem', color: '#1e3a8a' }}><strong>नोट:</strong> {activeToken.officerInstruction}</div>}
          </div>
        )}

        {/* ── LIVE AUCTION PANEL (shown whenever lot exists) ── */}
        {lotData && (
          <LiveAuctionPanel
            lotData={lotData}
            onAccepted={() => {
              // Optimistic update — backend WS event will also update
              setLotData(prev => prev ? { ...prev, status: 'BID_ACCEPTED' } : prev);
            }}
          />
        )}

        {/* Offline Payment Confirmation */}
        {farmerPayments?.filter(p => p.status === 'OFFLINE_PENDING_FARMER_CONFIRMATION').map(payment => (
          <div key={payment.id} style={{ background: '#fffbeb', border: '2px solid #f59e0b', borderRadius: '16px', padding: '16px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b45309', fontWeight: 800, marginBottom: '12px' }}>
              <AlertCircle size={22} /> भुगतान पुष्टि आवश्यक (Payment Confirmation Required)
            </div>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: '#451a03' }}>
              व्यापारी ने <b>₹{payment.amount}</b> का ऑफ़लाइन भुगतान (UTR/Ref: <b>{payment.offlineReference}</b>) दर्ज किया है। कृपया जांचें और पुष्टि करें।
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={async () => {
                if (window.confirm('क्या आपको बैंक में पैसे मिल गए हैं?')) {
                  try {
                    await farmerApi.farmerConfirmPayment(payment.id, true, 'Confirmed by farmer');
                    setFarmerPayments(prev => prev.map(p => p.id === payment.id ? { ...p, status: 'OFFLINE_PENDING_OFFICER_VERIFICATION' } : p));
                    alert('पुष्टि हो गई (Confirmed)');
                  } catch (e) { alert('Error: ' + (e.response?.data?.message || e.message)); }
                }
              }} style={{ flex: 1, background: '#16a34a', color: 'white', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                हाँ, मिल गए (Received)
              </button>
              <button onClick={async () => {
                const reason = window.prompt('कारण दर्ज करें:');
                if (reason !== null) {
                  try {
                    await farmerApi.farmerConfirmPayment(payment.id, false, reason || 'Did not receive money');
                    setFarmerPayments(prev => prev.map(p => p.id === payment.id ? { ...p, status: 'OFFLINE_REJECTED' } : p));
                    alert('अस्वीकृत (Rejected)');
                  } catch (e) { alert('Error: ' + (e.response?.data?.message || e.message)); }
                }
              }} style={{ flex: 1, background: '#ef4444', color: 'white', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                नहीं मिले (Not Received)
              </button>
            </div>
          </div>
        ))}

        {/* Payment Status Banner */}
        {paymentStatus && (
          <div style={{ background: paymentStatus.status === 'SUCCESS' ? '#f0fdf4' : '#eff6ff', border: `1px solid ${paymentStatus.status === 'SUCCESS' ? '#bbf7d0' : '#bfdbfe'}`, borderRadius: '12px', padding: '14px 18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontSize: '1.5rem' }}>{paymentStatus.status === 'SUCCESS' ? '✅' : paymentStatus.status?.includes('PROCESSING') ? '⏳' : '🔔'}</div>
            <div>
              <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>भुगतान स्थिति</div>
              <div style={{ fontSize: '0.82rem', color: '#334155' }}>
                Status: <b style={{ color: paymentStatus.status === 'SUCCESS' ? '#16a34a' : '#2563eb' }}>{String(paymentStatus.status ?? '').toUpperCase()}</b>
                {paymentStatus.amount ? ` · ₹${paymentStatus.amount}` : ''}
              </div>
            </div>
          </div>
        )}

        {/* J-Form Download — only after payment SUCCESS */}
        {lotData?.status === 'BID_ACCEPTED' && farmerPayments?.some(p => p.status === 'SUCCESS' || p.status === 'VERIFIED_SUCCESS') && (
          <div style={{ background: '#ffffff', border: '2px solid #22c55e', borderRadius: '16px', padding: '16px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#15803d', fontWeight: 800, marginBottom: '8px' }}>
              <ShieldCheck size={22} /> आधिकारिक J-Form खरीद रसीद
            </div>
            <div style={{ fontSize: '0.85rem', color: '#334155', marginBottom: '12px', lineHeight: 1.5 }}>
              लॉट नंबर: <b style={{ color: '#16a34a' }}>{lotData.lotNumber}</b><br />
              कुल वजन: <b>{lotData.actualWeight} क्विंटल</b><br />
              स्वीकृत मूल्य: <b style={{ color: '#059669' }}>₹{lotData.highestBidAmount}/क्विंटल</b><br />
              कुल भुगतान: <b style={{ color: '#059669', fontSize: '1.1rem' }}>₹{lotData.highestBidAmount && lotData.actualWeight ? (lotData.highestBidAmount * lotData.actualWeight).toLocaleString('en-IN') : '—'}</b>
            </div>
            <button onClick={() => alert('J-Form PDF डाउनलोड हो रहा है...')} className="btn-primary btn-full" style={{ padding: '10px', fontSize: '0.9rem' }}>
              <Download size={16} /> J-Form रसीद डाउनलोड करें (PDF)
            </button>
          </div>
        )}

        {/* 6-STAGE STEPPER */}
        <div className="kisan-card" style={{ padding: '20px 16px', marginBottom: '16px' }}>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', top: '24px', bottom: '24px', left: '20px', width: '3px', background: '#e2e8f0', zIndex: 1 }} />
            {steps.map((s) => {
              const isCompleted = s.id < currentStep;
              const isCurrent = s.id === currentStep;
              return (
                <div key={s.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: s.id === 6 ? 0 : '24px', position: 'relative', zIndex: 2 }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: isCompleted ? '#2e7d32' : (isCurrent ? '#f59e0b' : '#f1f5f9'), color: isCompleted || isCurrent ? '#ffffff' : '#64748b', border: isCurrent ? '3px solid #ffb300' : '2px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0, boxShadow: isCurrent ? '0 0 0 6px rgba(245, 158, 11, 0.25)' : 'none' }}>
                    {isCompleted ? <CheckCircle2 size={22} color="#fff" /> : <span>{s.icon}</span>}
                  </div>
                  <div style={{ flex: 1, background: isCurrent ? '#fffbeb' : (isCompleted ? '#f0fdf4' : '#ffffff'), border: isCurrent ? '1px solid #f59e0b' : '1px solid #e2e8f0', padding: '12px 14px', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', color: isCurrent ? '#b45309' : '#0f172a' }}>{s.title}</h4>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: isCompleted ? '#dcfce7' : (isCurrent ? '#fef3c7' : '#f1f5f9'), color: isCompleted ? '#15803d' : (isCurrent ? '#b45309' : '#64748b') }}>
                        {isCompleted ? t('stepCompleted') : (isCurrent ? t('stepInProgress') : t('stepPending'))}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#475569' }}>{s.desc}</p>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} /> {s.time}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProcurementTrackerPage;
