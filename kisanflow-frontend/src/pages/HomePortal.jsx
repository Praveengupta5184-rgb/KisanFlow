import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sprout, Shield, ArrowRight, Smartphone, Monitor, Sparkles, QrCode, Cpu, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const HomePortal = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
      {/* Hero Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0d3311, #1b5e20)',
          color: '#ffffff',
          borderRadius: '24px',
          padding: '48px 36px',
          textAlign: 'center',
          boxShadow: '0 20px 50px rgba(13, 51, 17, 0.3)',
          marginBottom: '40px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,179,0,0.2)', color: '#ffb300', padding: '6px 16px', borderRadius: '20px', fontWeight: 800, fontSize: '0.85rem', marginBottom: '16px' }}>
          <Sparkles size={16} /> Smart India Hackathon 2026 Submission
        </div>

        <h1 style={{ fontSize: '2.8rem', color: '#ffffff', marginBottom: '12px', letterSpacing: '-0.5px' }}>
          KisanFlow <span style={{ color: '#ffb300' }}>किसान प्रवाह</span>
        </h1>

        <p style={{ fontSize: '1.2rem', color: '#e2e8f0', maxWidth: '720px', margin: '0 auto 28px auto', lineHeight: 1.6 }}>
          AI-Powered Smart Queue & Agricultural Procurement Management System for Indian Mandis
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/farmer/discovery')}
            className="btn-primary"
            style={{ width: 'auto', padding: '14px 28px', background: '#ffb300', color: '#0d3311', fontWeight: 800, fontSize: '1.05rem', boxShadow: 'var(--shadow-gold)' }}
          >
            <Smartphone size={20} /> Open Farmer Mobile App
          </button>

          <button
            onClick={() => navigate('/officer/command-centre')}
            className="btn-secondary"
            style={{ width: 'auto', padding: '14px 28px', background: '#ffffff', color: '#0d3311', fontWeight: 800, fontSize: '1.05rem' }}
          >
            <Monitor size={20} /> Open District Command Center
          </button>
        </div>
      </div>

      {/* Two Portal Personas Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginBottom: '40px' }}>
        {/* Farmer Portal Card */}
        <div
          className="kisan-card"
          style={{
            padding: '32px',
            border: '2px solid #2e7d32',
            borderRadius: '20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ background: '#e8f5e9', width: '56px', height: '56px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2e7d32', marginBottom: '20px' }}>
              <Smartphone size={32} />
            </div>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '8px', color: '#0f172a' }}>
              🌾 Farmer Mobile Client (किसान ऐप)
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '20px' }}>
              Designed for rural and low-literacy farmers with regional languages, voice assistant ("Kisan Saathi"), and zero-wait queue slots.
            </p>

            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px 0', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9rem' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={16} color="#2e7d32" /> Mobile Login + Voice Navigation
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={16} color="#2e7d32" /> AI "Recommended Centre" (2.5h Saved)
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={16} color="#2e7d32" /> Crop Photo Quality AI Pre-Screening
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={16} color="#2e7d32" /> "Start Travelling Now" Silent Queue Alert
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={16} color="#2e7d32" /> 6-Stage Real-Time Procurement & DBT Stepper
              </li>
            </ul>
          </div>

          <button
            onClick={() => navigate('/farmer/discovery')}
            className="btn-primary"
          >
            Launch Farmer Portal <ArrowRight size={18} />
          </button>
        </div>

        {/* Officer Command Portal Card */}
        <div
          className="kisan-card"
          style={{
            padding: '32px',
            border: '2px solid #1e3a8a',
            borderRadius: '20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ background: '#e0e7ff', width: '56px', height: '56px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1e3a8a', marginBottom: '20px' }}>
              <Monitor size={32} />
            </div>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '8px', color: '#0f172a' }}>
              🛡️ District & Officer Command Dashboard
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '20px' }}>
              Data-dense control center for District Magistrates, DAOs, and Mandi Incharges with predictive AI modeling.
            </p>

            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px 0', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9rem' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={16} color="#1e3a8a" /> GIS Demand Heatmap & Live Yard Capacity
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={16} color="#1e3a8a" /> AI Crisis Predictor Cards with Countdown
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={16} color="#1e3a8a" /> Stage-Wise Bottleneck Detection Grid
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={16} color="#1e3a8a" /> "What-If" AI Queue & Flow Simulator
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={16} color="#1e3a8a" /> DBT Payment Delay & Yield Variance Audits
              </li>
            </ul>
          </div>

          <button
            onClick={() => navigate('/officer/command-centre')}
            className="btn-primary"
            style={{ background: '#1e3a8a' }}
          >
            Launch Command Dashboard <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomePortal;
