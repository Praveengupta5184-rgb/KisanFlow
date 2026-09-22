import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Sprout, Shield, Lock, User, ArrowRight, Eye, EyeOff, Zap, CheckCircle2, AlertCircle } from 'lucide-react';
import { useOfficer } from '../../context/OfficerContext';
import { officerApi } from '../../services/api';

/* ── Demo credentials ──────────────────────── */
const DEMO_ACCOUNTS = {
  DISTRICT_OFFICER: { username: 'district_manager',   password: 'DistrictManager@123' },
  CENTRE_OFFICER:   { username: 'officer_kapurthala', password: 'KapurthalaOfficer@123' },
};

const createDemoToken = (role) => {
  const encode = (v) =>
    window.btoa(JSON.stringify(v)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode({
    role, sub: 'demo', type: 'access', exp: Math.floor(Date.now() / 1000) + 86400,
  })}.demo`;
};

/* ═══════════════════════════════════════════════
   OFFICER LOGIN PAGE
═══════════════════════════════════════════════ */
const OfficerLoginPage = () => {
  const navigate = useNavigate();
  const { setOfficer } = useOfficer();

  const [officerType, setOfficerType] = useState('DISTRICT_OFFICER');
  const [username, setUsername]       = useState(DEMO_ACCOUNTS.DISTRICT_OFFICER.username);
  const [password, setPassword]       = useState(DEMO_ACCOUNTS.DISTRICT_OFFICER.password);
  const [showPass, setShowPass]       = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');

  const switchType = (t) => {
    setOfficerType(t);
    setUsername(DEMO_ACCOUNTS[t].username);
    setPassword(DEMO_ACCOUNTS[t].password);
    setError('');
  };

  /* Demo bypass */
  const demoLogin = () => {
    const creds = DEMO_ACCOUNTS[officerType];
    localStorage.setItem('token', createDemoToken('OFFICER'));
    localStorage.setItem('role', 'OFFICER');
    setOfficer({ username: creds.username, role: officerType });
    navigate('/officer/command-centre');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const response = await officerApi.login({ username, password });
      if (!response.data?.token) throw new Error('No token in response');
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('role', 'OFFICER');
      setOfficer(response.data.user || { username, role: response.data.role || officerType });
      navigate('/officer/command-centre');
    } catch (err) {
      localStorage.removeItem('token'); localStorage.removeItem('role');
      const status = err.response?.status;
      if (!err.response || err.code === 'ERR_NETWORK' || err.code === 'ECONNABORTED') {
        demoLogin(); // Auto demo when backend offline
      } else if (status === 401 || status === 400 || status === 403) {
        setError('Invalid credentials. Please check your username and password.');
      } else {
        setError(`Server error (${status || 'unknown'}). Use the Demo Login button below.`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="kf-auth-page">
      <div className="kf-auth-inner">

        {/* ══ LEFT ══════════════════════════════════════ */}
        <div className="kf-auth-left" style={{ background: 'linear-gradient(160deg, #1e3a8a 0%, #1d4ed8 55%, #1e40af 100%)' }}>
          <div className="kf-brand-logo">
            <div className="kf-brand-icon">
              <Sprout size={26} color="#fff" />
            </div>
            <div>
              <div className="kf-brand-name">KisanFlow</div>
              <div className="kf-brand-sub">किसान प्रवाह • Officer Command Portal</div>
            </div>
          </div>

          <div className="kf-auth-tagline">
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '7px',
              background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '99px', padding: '5px 14px',
              fontSize: '0.78rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)',
              textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px',
            }}>
              <Shield size={13} /> OFFICER COMMAND PORTAL
            </div>

            <h2>Agricultural Procurement Management & AI Decision Engine</h2>
            <p>
              Access the full mandi operations dashboard — live queue monitoring, token verification, lot management, QR gate scanning, and AI crisis prediction.
            </p>

            <ul className="kf-feature-list">
              <li><CheckCircle2 size={18} /> Live Queue & Token Management</li>
              <li><CheckCircle2 size={18} /> QR Gate Entry/Exit Scanning</li>
              <li><CheckCircle2 size={18} /> Official Lot Creation & Weighing</li>
              <li><CheckCircle2 size={18} /> AI Crisis Predictor & Bottleneck Detection</li>
              <li><CheckCircle2 size={18} /> Payment Stage Updates</li>
            </ul>
          </div>

          <div className="kf-auth-badge" style={{ background: 'rgba(96,165,250,0.2)', borderColor: 'rgba(96,165,250,0.4)', color: '#93c5fd' }}>
            🛡️ Authorized Personnel Only
          </div>
        </div>

        {/* ══ RIGHT ══════════════════════════════════════ */}
        <div className="kf-auth-right">
          <div className="kf-form-header">
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: '#eff6ff', border: '1px solid #bfdbfe',
              color: '#1d4ed8', fontSize: '0.72rem', fontWeight: 700,
              padding: '4px 12px', borderRadius: '99px',
              marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px',
            }}>
              <Shield size={13} /> Secure Officer Login
            </div>
            <h2>Officer Sign In</h2>
            <p>Select your designation and enter your credentials to access the command centre.</p>
          </div>

          {/* Officer type selector */}
          <div className="kf-role-tabs tabs-2">
            {[
              { key: 'DISTRICT_OFFICER', label: 'District DAO',   icon: '🏛️' },
              { key: 'CENTRE_OFFICER',   label: 'Mandi Incharge', icon: '🌾' },
            ].map(({ key, label, icon }) => (
              <button
                key={key}
                type="button"
                className={`kf-role-tab${officerType === key ? ' active' : ''}`}
                onClick={() => switchType(key)}
              >
                {icon} {label}
              </button>
            ))}
          </div>

          {/* Alert */}
          {error && (
            <div className="kf-alert kf-alert-error">
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin}>
            <div className="kf-form-group">
              <label className="kf-label">Username / Official ID <span className="required">*</span></label>
              <div className="kf-input-wrap">
                <span className="kf-input-icon"><User size={17} /></span>
                <input
                  id="officer-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  className="kf-input"
                  placeholder="officer_kapurthala"
                />
              </div>
            </div>

            <div className="kf-form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="kf-label" style={{ margin: 0 }}>Password <span className="required">*</span></label>
                <button type="button" className="kf-link" style={{ fontSize: '0.8rem' }}>Forgot password?</button>
              </div>
              <div className="kf-input-wrap">
                <span className="kf-input-icon"><Lock size={17} /></span>
                <input
                  id="officer-password"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="kf-input"
                  placeholder="••••••••••"
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

            <button
              type="submit"
              disabled={loading}
              className="kf-btn kf-btn-primary"
              style={{ background: loading ? undefined : '#1d4ed8', boxShadow: loading ? undefined : '0 4px 14px rgba(29,78,216,0.35)' }}
            >
              {loading
                ? <><span className="kf-spinner" /> Authenticating…</>
                : <>Sign In to Command Centre <ArrowRight size={16} /></>
              }
            </button>
          </form>

          {/* Credential hints */}
          <div className="kf-cred-box">
            <div className="kf-cred-box-title">Demo Credentials</div>
            <div className="kf-cred-box-row">
              <span style={{ color: '#f59e0b', fontWeight: 700 }}>District DAO:</span>{' '}
              district_manager / DistrictManager@123<br />
              <span style={{ color: '#22c55e', fontWeight: 700 }}>Mandi:</span>{' '}
              officer_kapurthala / KapurthalaOfficer@123
            </div>
          </div>

          {/* Demo bypass */}
          <div style={{ marginTop: '14px' }}>
            <button type="button" className="kf-demo-btn" onClick={demoLogin}>
              <Zap size={15} /> Demo Login — Works Offline
            </button>
            <p style={{ fontSize: '0.72rem', color: '#9ca3af', textAlign: 'center', marginTop: '6px', lineHeight: 1.4 }}>
              Demo mode works even when the backend server is offline.<br />
              Real login requires the Spring Boot backend at port 8080.
            </p>
          </div>

          <div className="kf-auth-footer">
            <Link to="/login" className="kf-link" style={{ fontSize: '0.82rem' }}>
              ← Back to Main Login
            </Link>
            {' · '}
            <Link to="/farmer/login" style={{ fontSize: '0.82rem', color: '#6b7280', textDecoration: 'none' }}>Farmer Portal</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfficerLoginPage;
