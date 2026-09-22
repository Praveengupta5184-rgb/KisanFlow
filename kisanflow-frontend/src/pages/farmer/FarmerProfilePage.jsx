import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, MapPin, Sprout, CheckCircle2, Mic, ArrowRight, ShieldCheck, Loader2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useFarmer } from '../../context/FarmerContext';
import { farmerApi } from '../../services/api';

const FarmerProfilePage = () => {
  const navigate = useNavigate();
  const { t, speakText } = useLanguage();
  const { farmer, setFarmer } = useFarmer();

  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    village: '',
    crop: 'Wheat',
    dbtLinked: true,
  });

  const crops = [
    { id: 'Wheat', label: 'गेहूं (Wheat)', icon: '🌾', msp: '₹2,275/Qtl' },
    { id: 'Paddy', label: 'धान (Paddy)', icon: '🌱', msp: '₹2,300/Qtl' },
    { id: 'Mustard', label: 'सरसों (Mustard)', icon: '🌻', msp: '₹5,650/Qtl' },
    { id: 'Cotton', label: 'कपास (Cotton)', icon: '☁️', msp: '₹7,121/Qtl' },
  ];

  useEffect(() => {
    farmerApi.getFarmerProfile()
      .then(data => {
        setFormData({
          name: data.name || '',
          village: data.village || '',
          crop: data.cropType || 'Wheat',
          dbtLinked: true
        });
        setFarmer(prev => ({ ...prev, ...data }));
      })
      .catch(err => console.error("Error loading profile", err))
      .finally(() => setLoading(false));
  }, [setFarmer]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setFarmer((prev) => ({ ...prev, ...formData }));
    speakText("प्रोफ़ाइल सफलतापूर्वक सहेजी गई।");
    navigate('/farmer/discovery');
  };

  return (
    <div className="farmer-layout">
      {/* Mobile Header */}
      <div className="farmer-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <User size={22} color="#ffb300" />
          <h3 style={{ margin: 0, color: '#fff', fontSize: '1.1rem' }}>किसान प्रोफ़ाइल सेटअप</h3>
        </div>
      </div>

      {/* Desktop Topbar */}
      <div className="farmer-desktop-topbar">
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>👤 {t('farmerProfile') || 'किसान प्रोफ़ाइल'}</h1>
          <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '2px 0 0' }}>अपनी जानकारी अपडेट करें</p>
        </div>
      </div>

      <div className="farmer-body">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <Loader2 className="animate-spin text-green-600" size={32} />
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
          {/* Farmer Name */}
          <div className="kisan-card">
            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.9rem', marginBottom: '8px', color: '#1e293b' }}>
              👤 {t('name')}
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                style={{
                  flex: 1,
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontWeight: 600,
                  fontSize: '1rem',
                }}
              />
            </div>
          </div>

          {/* Village & GPS Location */}
          <div className="kisan-card">
            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.9rem', marginBottom: '8px', color: '#1e293b' }}>
              📍 {t('village')}
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={formData.village}
                onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                style={{
                  flex: 1,
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontWeight: 600,
                  fontSize: '1rem',
                }}
              />
              <button
                type="button"
                onClick={() => {
                  setFormData({ ...formData, village: 'समस्तीपुर, बिहार (GPS Auto-Detected)' });
                  speakText("स्थान जीपीएस द्वारा लिया गया");
                }}
                style={{
                  background: '#e8f5e9',
                  color: '#2e7d32',
                  padding: '0 12px',
                  borderRadius: '10px',
                  border: '1px solid #c8e6c9',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                }}
              >
                <MapPin size={16} /> GPS
              </button>
            </div>
          </div>

          {/* Crop Selector Tiles */}
          <div className="kisan-card">
            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.9rem', marginBottom: '12px', color: '#1e293b' }}>
              🌾 {t('crop')} चुनें
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {crops.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setFormData({ ...formData, crop: c.id })}
                  style={{
                    padding: '14px',
                    borderRadius: '12px',
                    border: formData.crop === c.id ? '2px solid #2e7d32' : '1px solid #e2e8f0',
                    background: formData.crop === c.id ? '#e8f5e9' : '#ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                    position: 'relative',
                  }}
                >
                  {formData.crop === c.id && (
                    <CheckCircle2
                      size={18}
                      color="#2e7d32"
                      style={{ position: 'absolute', top: '8px', right: '8px' }}
                    />
                  )}
                  <span style={{ fontSize: '2rem' }}>{c.icon}</span>
                  <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{c.label}</span>
                  <span style={{ fontSize: '0.75rem', color: '#b7791f', fontWeight: 700 }}>MSP: {c.msp}</span>
                </div>
              ))}
            </div>
          </div>

          {/* DBT Direct Bank Account Badge */}
          <div
            style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              padding: '14px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '24px',
            }}
          >
            <ShieldCheck size={28} color="#16a34a" />
            <div>
              <div style={{ fontWeight: 700, color: '#166534', fontSize: '0.9rem' }}>
                {t('dbtStatus')}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#15803d' }}>
                SBI खाता सं: •••• 8839 (भुगतान सीधे खाते में ट्रांसफर होगा)
              </div>
            </div>
          </div>

          <button type="submit" className="btn-primary btn-full">
            {t('saveProfile')} <ArrowRight size={20} />
          </button>
        </form>
        )}
      </div>
    </div>
  );
};

export default FarmerProfilePage;
