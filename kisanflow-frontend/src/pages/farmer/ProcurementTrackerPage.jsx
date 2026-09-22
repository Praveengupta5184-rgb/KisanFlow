import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Clock, Circle, ArrowRight, Download, ShieldCheck, Volume2, Sparkles, Building2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useFarmer } from '../../context/FarmerContext';
import { farmerApi } from '../../services/api';

const ProcurementTrackerPage = () => {
  const navigate = useNavigate();
  const { t, speakText } = useLanguage();
  const { activeToken } = useFarmer();
  const [lotData, setLotData] = React.useState(null);

  const STAGE_ORDER = ['token_generated', 'arrived', 'weighing', 'quality_check', 'procurement', 'payment_processing', 'payment_released'];
  const currentStatusIndex = activeToken?.status ? Math.max(1, STAGE_ORDER.indexOf(activeToken.status) + 1) : 1;
  const currentStep = currentStatusIndex;

  React.useEffect(() => {
    if (activeToken?.id && currentStep >= 5) {
      farmerApi.getLotByBooking(activeToken.id)
        .then(setLotData)
        .catch(console.error);
    }
  }, [activeToken?.id, currentStep]);

  const steps = [
    {
      id: 1,
      title: t('step1'),
      desc: 'गेट पर ई-टोकन QR स्कैन एवं सुरक्षा जांच',
      time: activeToken?.arrivalDate ? new Date(activeToken.arrivalDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Pending',
      icon: '🎫',
    },
    {
      id: 2,
      title: t('step2'),
      desc: 'धर्मकांटा सकल वजन (Gross Weight)',
      time: currentStep > 1 ? 'Complete' : 'Pending',
      icon: '⚖️',
    },
    {
      id: 3,
      title: t('step3'),
      desc: 'नमी परीक्षण एवं ग्रेडिंग (Quality & Grading)',
      time: currentStep > 2 ? 'Complete' : 'Pending',
      icon: '🔬',
    },
    {
      id: 4,
      title: t('step4'),
      desc: 'फसल खाली कर शुद्ध वजन (Net Weight)',
      time: currentStep > 3 ? 'Complete' : 'Pending',
      icon: '🌾',
    },
    {
      id: 5,
      title: t('step5'),
      desc: 'J-Form रसीद एवं दस्तावेज़ीकरण',
      time: currentStep > 4 ? 'Complete' : 'Pending',
      icon: '📜',
    },
    {
      id: 6,
      title: t('step6'),
      desc: 'DBT राशि ट्रांसफर प्रक्रिया',
      time: currentStep > 5 ? 'Complete' : 'Pending',
      icon: '🏦',
    },
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
        <button
          onClick={handleAudioSummary}
          style={{ background: 'rgba(255,255,255,0.15)', color: '#ffb300', padding: '8px', borderRadius: '50%', border: 'none', cursor: 'pointer' }}
        >
          <Volume2 size={20} />
        </button>
      </div>

      {/* Desktop Topbar */}
      <div className="farmer-desktop-topbar">
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>🌾 {t('stepperTitle')}</h1>
          <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '2px 0 0' }}>टोकन #{activeToken?.tokenNumber} — खरीद यात्रा</p>
        </div>
        <button
          onClick={handleAudioSummary}
          style={{ background: '#f1f5f9', color: '#2e7d32', border: '1px solid #cbd5e1', padding: '8px 14px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, cursor: 'pointer' }}
        >
          <Volume2 size={16} /> सुनें
        </button>
      </div>

      <div className="farmer-body">
        {/* Token Info Strip */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            padding: '12px 16px',
            borderRadius: '12px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>खरीद केंद्र</div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
              {activeToken?.centreName || '---'}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>मात्रा (अनुमानित)</div>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: '#16a34a' }}>
              {activeToken?.quantityQtl || 0} क्विंटल
            </div>
          </div>
        </div>

        {/* Dynamic Live Instructions from Officer */}
        {(activeToken?.nextProcess || activeToken?.officerInstruction) && (
          <div style={{
            background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '16px', marginBottom: '16px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
          }}>
            <h4 style={{ margin: '0 0 8px', color: '#1d4ed8', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} /> अधिकारी के निर्देश (Officer Instructions)
            </h4>
            {activeToken?.nextProcess && (
              <div style={{ fontSize: '0.9rem', color: '#1e40af', marginBottom: '4px' }}>
                <strong>अगला चरण (Next):</strong> {activeToken.nextProcess}
                {activeToken?.nextCounter && ` (Counter ${activeToken.nextCounter})`}
              </div>
            )}
            {activeToken?.officerInstruction && (
              <div style={{ fontSize: '0.9rem', color: '#1e3a8a' }}>
                <strong>नोट:</strong> {activeToken.officerInstruction}
              </div>
            )}
          </div>
        )}

        {/* 6-STAGE INTERACTIVE STEPPER */}
        <div className="kisan-card" style={{ padding: '20px 16px', marginBottom: '16px' }}>
          <div style={{ position: 'relative' }}>
            {/* Connecting Vertical Line */}
            <div
              style={{
                position: 'absolute',
                top: '24px',
                bottom: '24px',
                left: '20px',
                width: '3px',
                background: '#e2e8f0',
                zIndex: 1,
              }}
            />

            {steps.map((s) => {
              const isCompleted = s.id < currentStep;
              const isCurrent = s.id === currentStep;
              const isPending = s.id > currentStep;

              return (
                <div
                  key={s.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '16px',
                    marginBottom: s.id === 6 ? 0 : '24px',
                    position: 'relative',
                    zIndex: 2,
                  }}
                >
                  {/* Step Status Node Icon */}
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      background: isCompleted ? '#2e7d32' : (isCurrent ? '#f59e0b' : '#f1f5f9'),
                      color: isCompleted || isCurrent ? '#ffffff' : '#64748b',
                      border: isCurrent ? '3px solid #ffb300' : '2px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.2rem',
                      flexShrink: 0,
                      boxShadow: isCurrent ? '0 0 0 6px rgba(245, 158, 11, 0.25)' : 'none',
                    }}
                  >
                    {isCompleted ? <CheckCircle2 size={22} color="#fff" /> : <span>{s.icon}</span>}
                  </div>

                  {/* Step Description Card */}
                  <div
                    style={{
                      flex: 1,
                      background: isCurrent ? '#fffbeb' : (isCompleted ? '#f0fdf4' : '#ffffff'),
                      border: isCurrent ? '1px solid #f59e0b' : '1px solid #e2e8f0',
                      padding: '12px 14px',
                      borderRadius: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', color: isCurrent ? '#b45309' : '#0f172a' }}>
                        {s.title}
                      </h4>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: isCompleted ? '#dcfce7' : (isCurrent ? '#fef3c7' : '#f1f5f9'),
                          color: isCompleted ? '#15803d' : (isCurrent ? '#b45309' : '#64748b'),
                        }}
                      >
                        {isCompleted ? t('stepCompleted') : (isCurrent ? t('stepInProgress') : t('stepPending'))}
                      </span>
                    </div>

                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#475569' }}>
                      {s.desc}
                    </p>

                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} /> {s.time}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* J-Form Digital Receipt Slip (Visible once Step 5 or 6 reached) */}
        {currentStep >= 5 && lotData && (
          <div
            style={{
              background: '#ffffff',
              border: '2px solid #22c55e',
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#15803d', fontWeight: 800, marginBottom: '8px' }}>
              <ShieldCheck size={22} /> आधिकारिक J-Form खरीद रसीद जारी
            </div>
            <div style={{ fontSize: '0.85rem', color: '#334155', marginBottom: '12px', lineHeight: 1.5 }}>
              लॉट नंबर (Lot Number): <b style={{ fontSize: '1.1rem', color: '#16a34a' }}>{lotData.lotNumber}</b><br />
              कुल वास्तविक मात्रा (Actual Weight): <b>{lotData.actualWeight} क्विंटल</b><br />
              आधार मूल्य (Base Price): <b>₹{lotData.basePrice}/क्विंटल</b><br />
              गुणवत्ता ग्रेड (Quality Grade): <b>{lotData.qualityGrade}</b><br />
              {lotData.highestBidAmount && (
                <>
                  उच्चतम बोली (Highest Bid): <b>₹{lotData.highestBidAmount}/क्विंटल</b><br />
                  कुल भुगतान (Total Payout): <b style={{ color: '#059669', fontSize: '1.1rem' }}>₹{(lotData.actualWeight * lotData.highestBidAmount).toLocaleString('en-IN')}</b><br />
                </>
              )}
              ऑक्शन/खरीद स्थिति (Status): <b>{lotData.status.toUpperCase()}</b><br />
              बैंक संदर्भ: <b>DBT-Transfer-Pending</b>
            </div>
            <button
              onClick={() => alert("J-Form PDF डाउनलोड हो रहा है...")}
              className="btn-primary btn-full"
              style={{ padding: '10px', fontSize: '0.9rem' }}
            >
              <Download size={16} /> J-Form रसीद डाउनलोड करें (PDF)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProcurementTrackerPage;
