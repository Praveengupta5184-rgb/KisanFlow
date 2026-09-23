import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import {
  Sprout, Phone, ShieldCheck, ArrowRight, UserPlus, LogIn,
  AlertCircle, CheckCircle2, ChevronDown, Eye, EyeOff, Zap,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useFarmer } from '../../context/FarmerContext';

/* ── Constants ──────────────────────────────── */
const API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
  '/api';

const DEMO_BYPASS_CODE = '123456';

const createDemoToken = () => {
  const enc = (v) => window.btoa(JSON.stringify(v)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${enc({ alg: 'none', typ: 'JWT' })}.${enc({ role: 'FARMER', type: 'access', sub: 'demo', exp: Math.floor(Date.now() / 1000) + 86400 })}.demo`;
};

/* ── Select ─────────────────────────────────── */
const KfSelect = ({ id, value, onChange, options, placeholder }) => (
  <div className="kf-select-wrap">
    <select id={id} value={value} onChange={onChange} className="kf-select">
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
    <ChevronDown size={15} className="kf-select-arrow" />
  </div>
);

/* ═══════════════════════════════════════════════
   MAIN COMPONENT: FarmerLoginPage
   (Farmer-specific OTP login + quick register)
═══════════════════════════════════════════════ */
const FarmerLoginPage = () => {
  const navigate = useNavigate();
  const { lang, setLang, availableLanguages, t, speakText } = useLanguage();
  const { setFarmer } = useFarmer();

  const [activeView, setActiveView] = useState('login');    // 'login' | 'register'
  const [loginStep, setLoginStep]   = useState('phone');    // 'phone' | 'otp'

  // Login state
  const [mobile, setMobile]   = useState('9876543210');
  const [otp, setOtp]         = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Register state
  const [regName, setRegName]         = useState('');
  const [regMobile, setRegMobile]     = useState('');
  const [regVillage, setRegVillage]   = useState('');
  const [regLanguage, setRegLanguage] = useState('hi');
  const [regCropType, setRegCropType] = useState('');
  const [regLoading, setRegLoading]   = useState(false);

  // Shared
  const [error, setError]           = useState('');
  const [successInfo, setSuccessInfo] = useState('');

  const langs = availableLanguages || [
    { code: 'hi', label: 'हिन्दी', flag: '🌾' },
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'pb', label: 'ਪੰਜਾਬੀ', flag: '🚜' },
  ];

  const cropOptions = [
    { value: 'Wheat',     label: 'Wheat (गेहूं)' },
    { value: 'Paddy',     label: 'Paddy / Rice (धान)' },
    { value: 'Mustard',   label: 'Mustard (सरसों)' },
    { value: 'Cotton',    label: 'Cotton (कपास)' },
    { value: 'Sugarcane', label: 'Sugarcane (गन्ना)' },
    { value: 'Maize',     label: 'Maize (मक्का)' },
  ];

  const langOptions = [
    { value: 'hi', label: 'हिन्दी (Hindi)' },
    { value: 'en', label: 'English' },
    { value: 'pb', label: 'ਪੰਜਾਬੀ (Punjabi)' },
  ];

  /* Demo bypass — works offline */
  const demoLogin = () => {
    localStorage.setItem('token', createDemoToken());
    localStorage.setItem('role', 'FARMER');
    setFarmer({
      id: `demo-${mobile || '9876543210'}`,
      name: 'Demo Farmer',
      mobile: mobile || '9876543210',
      village: 'Demo Village, Punjab',
      crop: 'Wheat',
      preferredLanguage: 'hi',
      dbtLinked: true,
      bankName: 'State Bank of India (SBI)',
      accountLast4: '8839',
    });
    navigate('/farmer/discovery');
  };

  /* Register */
  const handleRegister = async (e) => {
    e?.preventDefault();
    setError(''); setSuccessInfo('');
    if (!regName.trim()) { setError('Please enter your full name.'); return; }
    if (!regMobile || regMobile.length < 10) { setError('Please enter a valid 10-digit mobile number.'); return; }
    if (!regVillage.trim()) { setError('Please enter your village or town.'); return; }
    setRegLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/v1/auth/farmer/register`, {
        name: regName.trim(), mobileNumber: regMobile,
        village: regVillage.trim(), preferredLanguage: regLanguage || 'hi',
        cropType: regCropType || 'Wheat',
      }, { headers: { 'Content-Type': 'application/json' } });
      if (response.status === 201) {
        setSuccessInfo('Registration successful! You can now log in with OTP.');
        setMobile(regMobile);
        setActiveView('login'); setLoginStep('phone');
        speakText?.('Registration successful. Please log in with OTP.');
      }
    } catch (reqError) {
      if (reqError.response?.status === 409) {
        setError('This mobile number is already registered. Please log in instead.');
      } else if (!reqError.response) {
        setError('Unable to connect. Please check your internet connection.');
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setRegLoading(false);
    }
  };

  /* Send OTP */
  const handleSendOtp = async (e) => {
    e?.preventDefault();
    if (!mobile || mobile.length < 10) { setError('Please enter a valid 10-digit mobile number.'); return; }
    setError(''); setSuccessInfo(''); setLoginLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/v1/auth/otp/send`, { mobileNumber: mobile }, { headers: { 'Content-Type': 'application/json' } });
      setLoginStep('otp');
      const devOtp = response.data?.developmentOtp || '123456';
      setOtp(devOtp);
      setSuccessInfo(`OTP sent. Demo code: ${devOtp}`);
      speakText?.('OTP sent. Please enter the verification code.');
    } catch {
      setLoginStep('otp');
      setOtp('123456');
      setSuccessInfo('Sandbox mode — use OTP: 123456');
    } finally {
      setLoginLoading(false);
    }
  };

  /* Verify OTP */
  const handleVerifyOtp = async (e) => {
    e?.preventDefault();
    if (!otp || otp.length < 4) { setError('Please enter the OTP code.'); return; }
    setError(''); setSuccessInfo(''); setLoginLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/v1/auth/otp/verify`, { mobileNumber: mobile, otp }, { headers: { 'Content-Type': 'application/json' } });
      const token = response.data.token || response.data.accessToken;
      if (!token) throw new Error('No token');
      localStorage.setItem('token', token);
      localStorage.setItem('role', 'FARMER');
      const fd = response.data.farmer;
      setFarmer(fd ? {
        id: fd.id || response.data.farmerId, name: fd.name, mobile: fd.mobileNumber || mobile,
        village: fd.village, crop: fd.cropType || 'Wheat', preferredLanguage: fd.preferredLanguage || 'hi',
        dbtLinked: true, bankName: 'State Bank of India (SBI)', accountLast4: '8839',
      } : { id: response.data.farmerId || response.data.userId, name: 'Farmer', mobile, village: '', crop: 'Wheat', dbtLinked: true, bankName: 'SBI', accountLast4: '8839' });
      speakText?.('Verification successful. Loading farmer dashboard.');
      navigate('/farmer/discovery');
    } catch (requestError) {
      if (otp === DEMO_BYPASS_CODE) { demoLogin(); return; }
      localStorage.removeItem('token'); localStorage.removeItem('role');
      const status = requestError.response?.status;
      if (status === 401) setError('Invalid OTP. Please check the code and try again. Bypass: 123456');
      else if (status === 404) setError('No account found for this number. Please register first.');
      else setError('Connection failed. Use demo login below (works offline).');
    } finally {
      setLoginLoading(false);
    }
  };

  return (
    <div className="kf-auth-page">
      <div className="kf-auth-inner">

        {/* ══ LEFT ═══════════════════════════════════════ */}
        <div className="kf-auth-left">
          <div className="kf-brand-logo">
            <div className="kf-brand-icon">
              <Sprout size={26} color="#fff" />
            </div>
            <div>
              <div className="kf-brand-name">KisanFlow</div>
              <div className="kf-brand-sub">किसान प्रवाह • Farmer Portal</div>
            </div>
          </div>

          <div className="kf-auth-tagline">
            <h2>Your Digital Gateway to the Mandi</h2>
            <p>
              Register once, log in with OTP, and manage your crop bookings, queue tokens, and payment status — all in one place.
            </p>
            <ul className="kf-feature-list">
              <li><CheckCircle2 size={18} /> OTP-Based Secure Login (no password needed)</li>
              <li><CheckCircle2 size={18} /> Book Mandi Slots in Minutes</li>
              <li><CheckCircle2 size={18} /> AI Recommended Nearest Centre</li>
              <li><CheckCircle2 size={18} /> Real-Time Token & Queue Status</li>
              <li><CheckCircle2 size={18} /> Procurement & Payment Tracking</li>
            </ul>
          </div>
          <div className="kf-auth-badge">🌾 Smart India Hackathon 2026</div>
        </div>

        {/* ══ RIGHT ══════════════════════════════════════ */}
        <div className="kf-auth-right">
          {/* Brand (mobile) */}
          <div style={{ display: 'none' }} className="mobile-brand">
            <div className="kf-brand-logo" style={{ marginBottom: '16px', justifyContent: 'center' }}>
              <div className="kf-brand-icon" style={{ background: '#1b5e20', border: '2px solid rgba(46,125,50,0.3)' }}>
                <Sprout size={24} color="#fff" />
              </div>
              <div>
                <div className="kf-brand-name" style={{ color: '#0f172a', fontSize: '1.3rem' }}>KisanFlow</div>
                <div className="kf-brand-sub" style={{ color: '#6b7280' }}>Farmer Portal</div>
              </div>
            </div>
          </div>

          {/* Language selector */}
          <div className="kf-lang-pills">
            {langs.map((l) => (
              <button
                key={l.code}
                type="button"
                className={`kf-lang-pill${lang === l.code ? ' active' : ''}`}
                onClick={() => setLang?.(l.code)}
              >
                {l.flag} {l.label}
              </button>
            ))}
          </div>

          <div className="kf-form-header">
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: '#f0fdf4', border: '1px solid #bbf7d0',
              color: '#15803d', fontSize: '0.72rem', fontWeight: 700,
              padding: '4px 12px', borderRadius: '99px',
              marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px',
            }}>
              <ShieldCheck size={13} /> Farmer Portal
            </div>
            <h2>
              {activeView === 'login' ? 'Sign In with OTP' : 'Create Farmer Account'}
            </h2>
            <p>
              {activeView === 'login'
                ? 'Enter your registered mobile number to receive an OTP.'
                : 'Fill in your details to register for mandi services.'}
            </p>
          </div>

          {/* View toggle */}
          <div className="kf-role-tabs tabs-2" style={{ marginBottom: '20px' }}>
            {[
              { view: 'login',    icon: <LogIn size={15} />,    label: 'OTP Login' },
              { view: 'register', icon: <UserPlus size={15} />, label: 'New Registration' },
            ].map(({ view, icon, label }) => (
              <button
                key={view}
                type="button"
                className={`kf-role-tab${activeView === view ? ' active' : ''}`}
                onClick={() => { setActiveView(view); setError(''); setSuccessInfo(''); }}
              >
                {icon} {label}
              </button>
            ))}
          </div>

          {/* Alerts */}
          {error && (
            <div className="kf-alert kf-alert-error">
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} /><span>{error}</span>
            </div>
          )}
          {successInfo && (
            <div className="kf-alert kf-alert-success">
              <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: '1px' }} /><span>{successInfo}</span>
            </div>
          )}

          {/* ══ REGISTER VIEW ══════════════════════════════════ */}
          {activeView === 'register' && (
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              <div className="kf-form-group">
                <label className="kf-label">Full Name <span className="required">*</span></label>
                <div className="kf-input-wrap">
                  <input
                    id="reg-name" type="text" value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Gurpreet Singh" className="kf-input"
                  />
                </div>
              </div>

              <div className="kf-form-group">
                <label className="kf-label">Mobile Number <span className="required">*</span></label>
                <div className="kf-phone-group">
                  <span className="kf-phone-prefix">🇮🇳 +91</span>
                  <input
                    id="reg-mobile" type="tel" maxLength={10}
                    value={regMobile} onChange={(e) => setRegMobile(e.target.value.replace(/\D/g, ''))}
                    placeholder="98765 43210" className="kf-phone-input"
                  />
                </div>
              </div>

              <div className="kf-form-group">
                <label className="kf-label">Village / Town <span className="required">*</span></label>
                <div className="kf-input-wrap">
                  <input
                    id="reg-village" type="text" value={regVillage}
                    onChange={(e) => setRegVillage(e.target.value)}
                    placeholder="Sultanpur Lodhi" className="kf-input"
                  />
                </div>
              </div>

              <div className="kf-form-group">
                <label className="kf-label">Preferred Language</label>
                <KfSelect id="reg-lang" value={regLanguage} onChange={(e) => setRegLanguage(e.target.value)} options={langOptions} />
              </div>

              <div className="kf-form-group">
                <label className="kf-label">Primary Crop</label>
                <KfSelect id="reg-crop" value={regCropType} onChange={(e) => setRegCropType(e.target.value)} options={cropOptions} placeholder="Select Crop (Optional)" />
              </div>

              <button type="submit" id="register-btn" disabled={regLoading} className="kf-btn kf-btn-primary" style={{ marginTop: '4px' }}>
                {regLoading ? <><span className="kf-spinner" /> Registering…</> : <><UserPlus size={17} /> Create Account</>}
              </button>

              <div style={{ marginTop: '14px', textAlign: 'center', fontSize: '0.82rem', color: '#6b7280' }}>
                Want more options?{' '}
                <Link to="/register" className="kf-link">Full Registration Form</Link>
              </div>
            </form>
          )}

          {/* ══ LOGIN VIEW ══════════════════════════════════════ */}
          {activeView === 'login' && (
            <>
              {loginStep === 'phone' ? (
                <form onSubmit={handleSendOtp}>
                  <div className="kf-form-group">
                    <label className="kf-label">Mobile Number <span className="required">*</span></label>
                    <div className="kf-phone-group">
                      <span className="kf-phone-prefix">🇮🇳 +91</span>
                      <input
                        id="login-mobile" type="tel" maxLength={10}
                        value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                        placeholder="98765 43210" autoComplete="tel"
                        className="kf-phone-input"
                      />
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#6b7280', marginTop: '5px' }}>
                      Enter the mobile number registered with your Farmer ID
                    </div>
                  </div>

                  <button type="submit" id="send-otp-btn" disabled={loginLoading} className="kf-btn kf-btn-primary">
                    {loginLoading ? <><span className="kf-spinner" /> Sending OTP…</> : <>{t?.('getOtp') || 'Get OTP'} <ArrowRight size={16} /></>}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div style={{ fontSize: '0.88rem', color: '#374151', fontWeight: 600 }}>
                      OTP sent to +91-{mobile}
                    </div>
                    <button
                      type="button" className="kf-link" style={{ fontSize: '0.8rem' }}
                      onClick={() => { setLoginStep('phone'); setError(''); setSuccessInfo(''); }}
                    >
                      ← Change
                    </button>
                  </div>

                  <div className="kf-form-group">
                    <label className="kf-label">Enter 6-Digit OTP <span className="required">*</span></label>
                    <input
                      id="login-otp" type="text" maxLength={6}
                      value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="——————" className="kf-otp-input"
                      autoFocus
                    />
                    <div style={{ marginTop: '8px', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block', background: '#fefce8', border: '1px solid #fde68a',
                        color: '#92400e', fontSize: '0.76rem', fontWeight: 600,
                        padding: '3px 12px', borderRadius: '6px',
                      }}>
                        Hackathon demo bypass: <b>123456</b>
                      </span>
                    </div>
                  </div>

                  <button type="submit" id="verify-otp-btn" disabled={loginLoading} className="kf-btn kf-btn-primary">
                    {loginLoading ? <><span className="kf-spinner" /> Verifying…</> : <><ShieldCheck size={16} /> Verify & Sign In</>}
                  </button>
                </form>
              )}

              {/* Demo bypass */}
              <div style={{ marginTop: '16px', borderTop: '1px solid #f0f0f0', paddingTop: '16px' }}>
                <button type="button" className="kf-demo-btn" onClick={demoLogin}>
                  <Zap size={15} /> Demo Login — Works Offline
                </button>
                <p style={{ fontSize: '0.72rem', color: '#9ca3af', textAlign: 'center', marginTop: '6px' }}>
                  Bypass mode for testing when backend is unavailable.
                </p>
              </div>
            </>
          )}

          <div className="kf-auth-footer" style={{ marginTop: '20px' }}>
            <Link to="/login" className="kf-link" style={{ fontSize: '0.82rem' }}>
              ← Back to Main Login
            </Link>
            {' · '}
            <Link to="/officer/login" style={{ fontSize: '0.82rem', color: '#6b7280', textDecoration: 'none' }}>Officer Login</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FarmerLoginPage;
