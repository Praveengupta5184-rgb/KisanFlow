import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Sparkles, Clock, Users, Navigation, ArrowRight, Volume2, Camera, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useFarmer } from '../../context/FarmerContext';
import StatusPill from '../../components/common/StatusPill';

const CentreDiscoveryPage = () => {
  const navigate = useNavigate();
  const { t, speakText } = useLanguage();
  const { centres, setSelectedCentre, cropPrices, centrePrices, centreQueue } = useFarmer();

  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'map'
  const recommendedCentre = centres.length > 0 ? centres[0] : null;
  const priceByCrop = Object.fromEntries((cropPrices || []).map((item) => [item.cropType, item.price]));

  const handleSelectCentre = (centre) => {
    setSelectedCentre(centre);
    speakText(`${centre.name} चुना गया।`);
    navigate('/farmer/slot-booking');
  };

  return (
    <div className="farmer-layout">
      {/* Mobile Header */}
      <div className="farmer-header">
        <div>
          <h2 style={{ fontSize: '1.1rem', color: '#fff', margin: 0 }}>{t('nearbyCentres')}</h2>
          <span style={{ fontSize: '0.72rem', opacity: 0.85 }}>📍 समस्तीपुर / पंजाब क्षेत्र (4 केंद्र उपलब्ध)</span>
        </div>
        <button
          onClick={() => speakText("निकटतम खरीद केंद्रों की सूची। राजपुरा स्मार्ट केंद्र में सबसे कम भीड़ है।")}
          style={{ background: 'rgba(255,255,255,0.15)', color: '#ffb300', padding: '8px', borderRadius: '50%', border: 'none', cursor: 'pointer' }}
        >
          <Volume2 size={20} />
        </button>
      </div>

      {/* Desktop Topbar */}
      <div className="farmer-desktop-topbar">
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>🏛️ {t('nearbyCentres')}</h1>
          <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '2px 0 0' }}>📍 समस्तीपुर / पंजाब क्षेत्र — 4 केंद्र उपलब्ध</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={() => speakText("निकटतम खरीद केंद्रों की सूची।")}
            style={{ background: '#f1f5f9', color: '#2e7d32', border: '1px solid #cbd5e1', padding: '8px 14px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, cursor: 'pointer' }}
          >
            <Volume2 size={16} /> Audio
          </button>
        </div>
      </div>

      <div className="farmer-body">
        <div className="kisan-card" style={{ padding: '16px', marginBottom: '16px', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
            <div><b>मंडी में अभी मौजूद किसान</b><div style={{ fontSize: '0.78rem', color: '#64748b' }}>Live mandi count</div></div>
            <strong style={{ fontSize: '1.35rem', color: '#15803d' }}>{centreQueue?.activeFarmerCount ?? centreQueue?.pendingCount ?? 0}</strong>
          </div>
          <div style={{ marginTop: '12px', fontSize: '0.82rem', color: '#334155' }}>
            आज के भाव: {Object.keys(priceByCrop).length ? Object.entries(priceByCrop).map(([crop, price]) => `${crop} ₹${price}/Q`).join(' • ') : 'Officer द्वारा update होने पर यहां दिखेंगे'}
          </div>
        </div>
        {/* Quality Check Quick Banner */}
        <div
          onClick={() => navigate('/farmer/crop-quality')}
          style={{
            background: 'linear-gradient(135deg, #e0f2fe, #dbeafe)',
            border: '1px solid #bfdbfe',
            borderRadius: '14px',
            padding: '12px 16px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: '#0284c7', color: '#fff', padding: '8px', borderRadius: '10px' }}>
              <Camera size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0369a1' }}>
                🌾 {t('cropQualityTitle')}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#0284c7' }}>
                मंडी जाने से पहले दाने की फोटो खींचकर नमी व ग्रेड जांचें
              </div>
            </div>
          </div>
          <ArrowRight size={18} color="#0284c7" />
        </div>

        {/* AI RECOMMENDED CENTRE CARD (HIGHLIGHTED) */}
        {recommendedCentre && (
          <div
            style={{
              background: 'linear-gradient(135deg, #fffbeb, #fef3c7)',
              border: '2px solid #f59e0b',
              borderRadius: '16px',
              padding: '18px',
              marginBottom: '20px',
              boxShadow: 'var(--shadow-gold)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Sparkling Top Tag */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: '#d97706',
                color: '#ffffff',
                fontSize: '0.75rem',
                fontWeight: 800,
                padding: '4px 10px',
                borderRadius: '20px',
                marginBottom: '10px',
              }}
            >
              <Sparkles size={14} /> {t('aiRecommendation')}
            </div>

            <h3 style={{ fontSize: '1.2rem', color: '#78350f', marginBottom: '4px' }}>
              {recommendedCentre.name}
            </h3>

            <p style={{ fontSize: '0.85rem', color: '#92400e', marginBottom: '12px', fontWeight: 600 }}>
              💡 {recommendedCentre.aiReason || recommendedCentre.recommendationReason || 'Optimal based on AI analysis'} (Score: {Math.round(recommendedCentre.aiScore || 0)})
            </p>

            {/* Metrics Comparison Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '8px',
                background: 'rgba(255,255,255,0.7)',
                padding: '10px',
                borderRadius: '10px',
                marginBottom: '14px',
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{t('distance')}</div>
                <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>
                  {recommendedCentre.distanceKm} km
                </div>
              </div>
              <div style={{ textAlign: 'center', borderLeft: '1px solid #cbd5e1', borderRight: '1px solid #cbd5e1' }}>
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{t('estWait')}</div>
                <div style={{ fontWeight: 800, color: '#16a34a', fontSize: '0.95rem' }}>
                  ⚡ {recommendedCentre.aiWait || recommendedCentre.estWaitMinutes || 0} min
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{t('timeSaved')}</div>
                <div style={{ fontWeight: 800, color: '#d97706', fontSize: '0.95rem' }}>
                  🎉 {recommendedCentre.timeSavedHours}
                </div>
              </div>
            </div>

            <button
              onClick={() => handleSelectCentre(recommendedCentre)}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #15803d, #166534)',
                color: '#ffffff',
                padding: '14px',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(21, 128, 61, 0.3)',
              }}
            >
              <span>{t('bookSlot')} (अनुशंसित केंद्र चुनें)</span>
              <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* View Toggle (List vs Interactive Map View) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h4 style={{ margin: 0, fontSize: '1rem', color: '#334155' }}>
            सभी आस-पास के केंद्र ({centres.length})
          </h4>
          <div style={{ display: 'flex', gap: '4px', background: '#e2e8f0', padding: '3px', borderRadius: '8px' }}>
            <button
              onClick={() => setActiveTab('list')}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                background: activeTab === 'list' ? '#ffffff' : 'transparent',
                fontWeight: 700,
                fontSize: '0.75rem',
                color: '#0f172a',
              }}
            >
              सूची (List)
            </button>
            <button
              onClick={() => setActiveTab('map')}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                background: activeTab === 'map' ? '#ffffff' : 'transparent',
                fontWeight: 700,
                fontSize: '0.75rem',
                color: '#0f172a',
              }}
            >
              नक्शा (Map)
            </button>
          </div>
        </div>

        {/* Interactive Simulated Map View */}
        {activeTab === 'map' && (
          <div
            style={{
              height: '240px',
              borderRadius: '14px',
              background: 'linear-gradient(180deg, #dcfce7, #f1f5f9)',
              border: '2px solid #cbd5e1',
              marginBottom: '16px',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Map Roads / Background grid */}
            <div style={{ position: 'absolute', inset: 0, opacity: 0.15, backgroundImage: 'radial-gradient(#1e293b 1px, transparent 1px)', backgroundSize: '16px 16px' }} />

            {/* Farmer Pin */}
            <div style={{ position: 'absolute', top: '50%', left: '48%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
              <div style={{ background: '#2563eb', color: '#fff', padding: '6px', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', boxShadow: '0 0 0 6px rgba(37, 99, 235, 0.2)' }}>
                📍
              </div>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, background: '#fff', padding: '1px 6px', borderRadius: '4px' }}>आप (Farmer)</span>
            </div>

            {/* Centre 1 (Green) */}
            <div
              onClick={() => handleSelectCentre(centres[0])}
              style={{ position: 'absolute', top: '20%', left: '25%', cursor: 'pointer', textAlign: 'center' }}
            >
              <div className="badge-green" style={{ padding: '4px 8px', fontSize: '0.7rem', borderRadius: '12px' }}>
                🟢 कपूरथला (30m)
              </div>
            </div>

            {/* Centre 2 (Recommended - Gold) */}
            <div
              onClick={() => handleSelectCentre(centres[1])}
              style={{ position: 'absolute', top: '25%', right: '15%', cursor: 'pointer', textAlign: 'center' }}
            >
              <div className="badge-gold animate-pulse-glow" style={{ padding: '6px 10px', fontSize: '0.75rem', borderRadius: '12px', fontWeight: 800 }}>
                ✨ राजपुरा (15m Fast)
              </div>
            </div>

            {/* Centre 3 (Red Jam) */}
            <div
              onClick={() => handleSelectCentre(centres[2])}
              style={{ position: 'absolute', bottom: '18%', left: '30%', cursor: 'pointer', textAlign: 'center' }}
            >
              <div className="badge-red" style={{ padding: '4px 8px', fontSize: '0.7rem', borderRadius: '12px' }}>
                🔴 पटियाला (2h 45m जाम)
              </div>
            </div>
          </div>
        )}

        {/* Regular Centre List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {centres.map((centre) => (
            <div key={centre.id} className="kisan-card" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                  <h4 style={{ fontSize: '1rem', margin: 0, color: '#0f172a' }}>{centre.name}</h4>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                    <MapPin size={12} /> {centre.district} • {centre.distanceKm} km दूरी
                  </div>
                </div>
                <StatusPill status={centre.capacityStatus} waitMinutes={centre.estWaitMinutes} />
              </div>

              {/* Stats Bar */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  background: '#f8fafc',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  marginBottom: '10px',
                }}
              >
                <div>
                  <span style={{ color: '#64748b' }}>वर्तमान कतार: </span>
                  <b>{centre.liveQueueCount} किसान</b>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>सक्रिय कांटे: </span>
                  <b>{centre.activeCounters} धर्मकांटे</b>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>आज का भाव: </span>
                  <b style={{ color: '#16a34a' }}>₹{Object.values(centrePrices?.[centre.id] || {})[0]?.price || priceByCrop[centre.cropType] || centre.mspRate || '—'}/Q</b>
                </div>
              </div>

              <button
                onClick={() => handleSelectCentre(centre)}
                className="btn-secondary"
                style={{ width: '100%', fontSize: '0.9rem', padding: '10px' }}
              >
                {t('bookSlot')} <ArrowRight size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CentreDiscoveryPage;
