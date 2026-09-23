import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Sprout, Phone, Lock, User, Eye, EyeOff, ArrowRight,
  ShieldCheck, CheckCircle2, AlertCircle, Zap, Wheat,
  Store, UserCog, ChevronDown,
} from 'lucide-react';
import { useFarmer } from '../../context/FarmerContext';
import { useOfficer } from '../../context/OfficerContext';
import { useTrader } from '../../context/TraderContext';
import { farmerApi, officerApi, traderApi } from '../../services/api';

/* ── Constants ──────────────────────────────────────── */
const API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
  '/api';

const DEMO_BYPASS_CODE = '123456';

const createDemoToken = (role) => {
  const enc = (v) =>
    window.btoa(JSON.stringify(v)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${enc({ alg: 'none', typ: 'JWT' })}.${enc({
    role,
    sub: 'demo',
    type: 'access',
    exp: Math.floor(Date.now() / 1000) + 86400,
  })}.demo`;
};

const ROLES = [
  { key: 'FARMER',  label: 'Farmer',      subLabel: 'किसान',    icon: <Wheat size={15} />,   color: '#15803d' },
  { key: 'OFFICER', label: 'Officer',     subLabel: 'अधिकारी',  icon: <UserCog size={15} />, color: '#1e40af' },
  { key: 'TRADER',  label: 'Trader/Buyer', subLabel: 'व्यापारी', icon: <Store size={15} />,   color: '#7c3aed' },
];

/* ══════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════ */
const KisanFlowLoginPage = () => {
  const navigate = useNavigate();
  const { setFarmer } = useFarmer();
  const { setOfficer } = useOfficer();
  const { setTrader } = useTrader();

  // Active role
  const [role, setRole] = useState('FARMER');

  // Farmer OTP state
  const [mobile, setMobile]   = useState('');
  const [otp, setOtp]         = useState('');
  const [otpStep, setOtpStep] = useState('phone'); // 'phone' | 'otp'

  // Password login state (Officer / Trader)
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  // UI
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');

  /* ── Reset form on role switch ───────────── */
  const switchRole = (r) => {
    setRole(r);
    setError(''); setSuccess('');
    setMobile(''); setOtp(''); setOtpStep('phone');
    setUsername(''); setPassword(''); setShowPass(false);
    // Prefill demo credentials
    if (r === 'OFFICER') { setUsername('officer_kapurthala'); setPassword('KapurthalaOfficer@123'); }
    if (r === 'TRADER')  { setUsername('demo_trader');        setPassword('Trader@123'); }
  };

  /* ── Demo bypass (offline) ───────────────── */
  const demoLogin = () => {
    if (role === 'FARMER') {
      localStorage.setItem('token', createDemoToken('FARMER'));
      localStorage.setItem('role', 'FARMER');
      setFarmer({
        id: `demo-${mobile || '9876543210'}`, name: 'Demo Farmer',
        mobile: mobile || '9876543210', village: 'Demo Village, Punjab',
        crop: 'Wheat', preferredLanguage: 'hi',
        dbtLinked: true, bankName: 'SBI', accountLast4: '8839',
      });
      navigate('/farmer/discovery');
    } else if (role === 'OFFICER') {
      localStorage.setItem('token', createDemoToken('OFFICER'));
      localStorage.setItem('role', 'OFFICER');
      setOfficer({ username: username || 'officer_kapurthala', role: 'OFFICER' });
      navigate('/officer/command-centre');
    } else {
      localStorage.setItem('token', createDemoToken('TRADER'));
      localStorage.setItem('role', 'TRADER');
      setTrader({ username: username || 'demo_trader', role: 'TRADER' });
      navigate('/trader/dashboard');
    }
  };

  /* ── Farmer: Send OTP ────────────────────── */
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!mobile || mobile.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    setError(''); setSuccess(''); setLoading(true);
    try {
      const res = await farmerApi.sendOtp(mobile);
      const devOtp = res?.developmentOtp || '123456';
      setOtp(devOtp);
      setOtpStep('otp');
      setSuccess(`OTP sent successfully. Demo code: ${devOtp}`);
    } catch {
      setOtp('123456');
      setOtpStep('otp');
      setSuccess('Sandbox mode — use OTP: 123456');
    } finally {
      setLoading(false);
    }
  };

  /* ── Farmer: Verify OTP ──────────────────── */
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp || otp.length < 4) { setError('Please enter the OTP code.'); return; }
    setError(''); setSuccess(''); setLoading(true);
    try {
      const res = await farmerApi.verifyOtp(mobile, otp);
      const token = res.data?.token || res.data?.accessToken;
      if (!token) throw new Error('No token');
      localStorage.setItem('token', token);
      localStorage.setItem('role', 'FARMER');
      const fd = res.data?.farmer;
      setFarmer(fd ? {
        id: fd.id || res.data.farmerId, name: fd.name, mobile: fd.mobileNumber || mobile,
        village: fd.village, crop: fd.cropType || 'Wheat',
        preferredLanguage: fd.preferredLanguage || 'hi',
        dbtLinked: true, bankName: 'SBI', accountLast4: '8839',
      } : { id: res.data.farmerId || res.data.userId, name: 'Farmer', mobile });
      navigate('/farmer/discovery');
    } catch (err) {
      if (otp === DEMO_BYPASS_CODE) { demoLogin(); return; }
      localStorage.removeItem('token'); localStorage.removeItem('role');
      const s = err.response?.status;
      if (s === 401) setError('Invalid OTP. Please try again or use bypass code 123456.');
      else if (s === 404) setError('No account found for this number. Please register first.');
      else setError('Connection failed. Try demo login below (works offline).');
    } finally {
      setLoading(false);
    }
  };

  /* ── Officer/Trader: Password Login ──────── */
  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) { setError('Please enter username and password.'); return; }
    setError(''); setLoading(true);
    try {
      const api = role === 'OFFICER' ? officerApi : traderApi;
      const res = await api.login({ username, password });
      const token = res.data?.token || res.data?.accessToken;
      if (!token) throw new Error('No token');
      const serverRole = res.data?.role || '';
      if (role === 'OFFICER' && !['OFFICER', 'DISTRICT_OFFICER', 'ADMIN'].includes(serverRole)) {
        setError('Access denied. This account does not have officer permissions.');
        return;
      }
      if (role === 'TRADER' && serverRole !== 'TRADER') {
        setError('Access denied. This account does not have trader permissions.');
        return;
      }
      localStorage.setItem('token', token);
      localStorage.setItem('role', serverRole === 'TRADER' ? 'TRADER' : 'OFFICER');
      if (role === 'OFFICER') {
        setOfficer(res.data?.user || { username, role: serverRole });
        navigate('/officer/command-centre');
      } else {
        setTrader({ username, role: 'TRADER', traderId: res.data?.traderId, centreId: res.data?.centreId });
        navigate('/trader/dashboard');
      }
    } catch (err) {
      localStorage.removeItem('token'); localStorage.removeItem('role');
      const s = err.response?.status;
      if (!err.response || err.code === 'ERR_NETWORK') {
        demoLogin(); // Auto demo bypass if backend offline
      } else if (s === 401 || s === 403) {
        setError('Invalid username or password. Please check your credentials.');
      } else {
        setError(`Server error (${s || 'unknown'}). Use "Demo Login" below.`);
      }
    } finally {
      setLoading(false);
    }
  };

  /* ── Derive active role meta ─────────────── */
  const roleMeta = ROLES.find((r) => r.key === role);

  return (
    <div className="kf-auth-page">
      <div className="kf-auth-inner">

        {/* ══ LEFT PANEL ════════════════════════════════════ */}
        <div className="kf-auth-left">
          {/* Brand */}
          <div className="kf-brand-logo">
            <div className="kf-brand-icon">
              <Sprout size={26} color="#fff" />
            </div>
            <div>
              <div className="kf-brand-name">KisanFlow</div>
              <div className="kf-brand-sub">किसान प्रवाह • Smart Mandi Portal</div>
            </div>
          </div>

          {/* Tagline */}
          <div className="kf-auth-tagline">
            <h2>
              Empowering India's Farmers with Digital Mandi Services
            </h2>
            <p>
              A unified platform connecting Farmers, Mandi Officers, and Traders
              for transparent, efficient, and fair agricultural procurement.
            </p>

            <ul className="kf-feature-list">
              <li><CheckCircle2 size={18} /> Zero-Wait Token & Smart Queue System</li>
              <li><CheckCircle2 size={18} /> Real-Time Procurement & Payment Tracking</li>
              <li><CheckCircle2 size={18} /> OTP-Based Secure Farmer Authentication</li>
              <li><CheckCircle2 size={18} /> AI Crop Quality Pre-Screening</li>
              <li><CheckCircle2 size={18} /> Multilingual — हिन्दी, ਪੰਜਾਬੀ, English</li>
            </ul>

            <div style={{ marginTop: '28px', borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '22px' }}>
              <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', marginBottom: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Supported by
              </div>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                {['Ministry of Agriculture', 'eNAM Network', 'APMC India'].map((s) => (
                  <div key={s} style={{
                    background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)',
                    borderRadius: '8px', padding: '6px 12px', fontSize: '0.76rem',
                    color: 'rgba(255,255,255,0.85)', fontWeight: 600,
                  }}>
                    {s}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="kf-auth-badge">
            🌾 Smart India Hackathon 2026
          </div>
        </div>

        {/* ══ RIGHT PANEL ═══════════════════════════════════ */}
        <div className="kf-auth-right">
          {/* Header */}
          <div className="kf-form-header">
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: '#f0fdf4', border: '1px solid #bbf7d0',
              color: '#15803d', fontSize: '0.72rem', fontWeight: 700,
              padding: '4px 12px', borderRadius: '99px',
              marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px',
            }}>
              <ShieldCheck size={13} /> Secure Login
            </div>
            <h2>Sign In to KisanFlow</h2>
            <p>Select your role and sign in to access your personalized dashboard.</p>
          </div>

          {/* Role Tabs */}
          <div className="kf-role-tabs tabs-3">
            {ROLES.map(({ key, label, subLabel, icon }) => (
              <button
                key={key}
                className={`kf-role-tab${role === key ? ' active' : ''}`}
                onClick={() => switchRole(key)}
                type="button"
              >
                {icon}
                <span>
                  <span style={{ display: 'block', lineHeight: 1.1 }}>{label}</span>
                  <span style={{ display: 'block', fontSize: '0.68rem', opacity: 0.7 }}>{subLabel}</span>
                </span>
              </button>
            ))}
          </div>

          {/* Alerts */}
          {error && (
            <div className="kf-alert kf-alert-error">
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="kf-alert kf-alert-success">
              <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
              <span>{success}</span>
            </div>
          )}

          {/* ══ FARMER LOGIN — OTP flow ══ */}
          {role === 'FARMER' && (
            <>
              {otpStep === 'phone' ? (
                <form onSubmit={handleSendOtp}>
                  <div className="kf-form-group">
                    <label className="kf-label">
                      Mobile Number <span className="required">*</span>
                    </label>
                    <div className="kf-phone-group">
                      <span className="kf-phone-prefix">🇮🇳 +91</span>
                      <input
                        id="login-mobile"
                        type="tel"
                        maxLength={10}
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                        placeholder="98765 43210"
                        autoComplete="tel"
                        className="kf-phone-input"
                      />
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#6b7280', marginTop: '5px' }}>
                      Enter the mobile number registered with your Mandi / Farmer ID
                    </div>
                  </div>

                  <button type="submit" className="kf-btn kf-btn-primary" disabled={loading} style={{ marginTop: '4px' }}>
                    {loading ? <><span className="kf-spinner" /> Sending OTP…</> : <>Get OTP <ArrowRight size={16} /></>}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div style={{ fontSize: '0.88rem', color: '#374151', fontWeight: 600 }}>
                      OTP sent to +91-{mobile}
                    </div>
                    <button
                      type="button"
                      className="kf-link"
                      style={{ fontSize: '0.82rem' }}
                      onClick={() => { setOtpStep('phone'); setError(''); setSuccess(''); }}
                    >
                      ← Change number
                    </button>
                  </div>

                  <div className="kf-form-group">
                    <label className="kf-label">Enter 6-Digit OTP <span className="required">*</span></label>
                    <input
                      id="login-otp"
                      type="text"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="——————"
                      className="kf-otp-input"
                      autoFocus
                    />
                    <div style={{ marginTop: '8px', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block', background: '#fefce8', border: '1px solid #fde68a',
                        color: '#92400e', fontSize: '0.78rem', fontWeight: 600,
                        padding: '3px 12px', borderRadius: '6px',
                      }}>
                        Hackathon demo bypass: <b>123456</b>
                      </span>
                    </div>
                  </div>

                  <button type="submit" className="kf-btn kf-btn-primary" disabled={loading} style={{ marginTop: '4px' }}>
                    {loading ? <><span className="kf-spinner" /> Verifying…</> : <><ShieldCheck size={16} /> Verify & Sign In</>}
                  </button>
                </form>
              )}

              <div style={{ marginTop: '12px', textAlign: 'right' }}>
                <button
                  type="button"
                  className="kf-link"
                  style={{ fontSize: '0.83rem' }}
                  onClick={() => setOtpStep('phone')}
                >
                  Resend OTP
                </button>
              </div>
            </>
          )}

          {/* ══ OFFICER / TRADER LOGIN — Password ══ */}
          {(role === 'OFFICER' || role === 'TRADER') && (
            <form onSubmit={handlePasswordLogin}>
              <div className="kf-form-group">
                <label className="kf-label">
                  {role === 'OFFICER' ? 'Username / Officer ID' : 'Trader Username / License No.'}
                  <span className="required"> *</span>
                </label>
                <div className="kf-input-wrap">
                  <span className="kf-input-icon"><User size={17} /></span>
                  <input
                    id="login-username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={role === 'OFFICER' ? 'officer_kapurthala' : 'demo_trader'}
                    autoComplete="username"
                    className="kf-input"
                  />
                </div>
              </div>

              <div className="kf-form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="kf-label" style={{ margin: 0 }}>
                    Password <span className="required">*</span>
                  </label>
                  <button type="button" className="kf-link" style={{ fontSize: '0.8rem' }}>
                    Forgot password?
                  </button>
                </div>
                <div className="kf-input-wrap">
                  <span className="kf-input-icon"><Lock size={17} /></span>
                  <input
                    id="login-password"
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••"
                    autoComplete="current-password"
                    className="kf-input"
                  />
                  <span className="kf-input-suffix">
                    <button
                      type="button"
                      className="kf-eye-btn"
                      onClick={() => setShowPass((p) => !p)}
                    >
                      {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </span>
                </div>
              </div>

              <button type="submit" className="kf-btn kf-btn-primary" disabled={loading} style={{ marginTop: '4px' }}>
                {loading
                  ? <><span className="kf-spinner" /> Authenticating…</>
                  : <>Sign In to {role === 'OFFICER' ? 'Command Centre' : 'Trader Dashboard'} <ArrowRight size={16} /></>
                }
              </button>

              {/* Credential hints */}
              <div className="kf-cred-box">
                <div className="kf-cred-box-title">Demo Credentials</div>
                {role === 'OFFICER' ? (
                  <div className="kf-cred-box-row">
                    <span style={{ color: '#f59e0b', fontWeight: 700 }}>District DAO:</span> district_manager / DistrictManager@123<br />
                    <span style={{ color: '#22c55e', fontWeight: 700 }}>Mandi Incharge:</span> officer_kapurthala / KapurthalaOfficer@123
                  </div>
                ) : (
                  <div className="kf-cred-box-row">
                    <span style={{ color: '#a855f7', fontWeight: 700 }}>Trader:</span> demo_trader / Trader@123
                  </div>
                )}
              </div>
            </form>
          )}

          {/* Demo Bypass */}
          <div style={{ marginTop: '16px', borderTop: '1px solid #f0f0f0', paddingTop: '16px' }}>
            <button
              type="button"
              className="kf-demo-btn"
              onClick={demoLogin}
            >
              <Zap size={15} /> Demo Login — Works Offline
            </button>
            <p style={{ fontSize: '0.72rem', color: '#9ca3af', textAlign: 'center', marginTop: '6px', lineHeight: 1.4 }}>
              Demo mode bypasses the backend server for testing purposes.
            </p>
          </div>

          {/* Sign Up link */}
          <div className="kf-auth-footer">
            {role === 'FARMER' ? (
              <>
                Don't have an account?{' '}
                <Link to="/register" className="kf-link">Register as Farmer</Link>
              </>
            ) : (
              <span style={{ color: '#9ca3af', fontSize: '0.82rem' }}>
                Officer / Trader accounts are created by your Mandi Administrator.
                <br />
                Farmer?{' '}
                <Link to="/register" className="kf-link">Register here</Link>
              </span>
            )}
          </div>

          {/* Portal links row */}
          <div style={{
            marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #f0f0f0',
            display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center',
          }}>
            {[
              { path: '/farmer/login', label: 'Farmer Portal' },
              { path: '/officer/login', label: 'Officer Portal' },
              { path: '/trader/login', label: 'Trader Portal' },
            ].map(({ path, label }) => (
              <Link
                key={path}
                to={path}
                style={{
                  fontSize: '0.75rem', color: '#6b7280', textDecoration: 'none',
                  padding: '3px 8px', borderRadius: '6px', border: '1px solid #e5e7eb',
                  background: '#f9fafb', fontWeight: 500,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#2e7d32'; e.currentTarget.style.color = '#2e7d32'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.color = '#6b7280'; }}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default KisanFlowLoginPage;
