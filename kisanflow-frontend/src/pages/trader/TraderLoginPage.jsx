import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Sprout, Store, User, Lock, ArrowRight, ShieldCheck, TrendingUp,
  AlertCircle, Eye, EyeOff, Zap, CheckCircle2,
} from 'lucide-react';
import { traderApi } from '../../services/api';
import { useTrader } from '../../context/TraderContext';

const createDemoToken = () => {
  const enc = (v) =>
    window.btoa(JSON.stringify(v)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${enc({ alg: 'none', typ: 'JWT' })}.${enc({
    role: 'TRADER', sub: 'demo', type: 'access', exp: Math.floor(Date.now() / 1000) + 86400,
  })}.demo`;
};

/* ═══════════════════════════════════════════════
   TRADER LOGIN PAGE
═══════════════════════════════════════════════ */
const TraderLoginPage = () => {
  const [username, setUsername] = useState('demo_trader');
  const [password, setPassword] = useState('Trader@123');
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const navigate = useNavigate();
  const { setTrader } = useTrader();

  /* Demo bypass */
  const demoLogin = () => {
    localStorage.setItem('token', createDemoToken());
    localStorage.setItem('role', 'TRADER');
    setTrader({ username: username || 'demo_trader', role: 'TRADER' });
    navigate('/trader/dashboard');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const response = await traderApi.login({ username, password });
      if (response.data?.token) {
        if (response.data.role === 'TRADER') {
          localStorage.setItem('token', response.data.token);
          localStorage.setItem('role', response.data.role);
          setTrader({
            username, role: response.data.role,
            traderId: response.data.traderId, centreId: response.data.centreId,
          });
          navigate('/trader/dashboard');
        } else {
          setError('Access denied. This account does not have trader permissions.');
        }
      } else {
        setError('Login failed. Please check your credentials.');
      }
    } catch (err) {
      if (!err.response || err.code === 'ERR_NETWORK') {
        demoLogin();
      } else {
        setError(err.response?.data?.message || 'Connection error. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="kf-auth-page">
      <div className="kf-auth-inner">

        {/* ══ LEFT ══════════════════════════════════════ */}
        <div className="kf-auth-left" style={{ background: 'linear-gradient(160deg, #4c1d95 0%, #6d28d9 55%, #7c3aed 100%)' }}>
          <div className="kf-brand-logo">
            <div className="kf-brand-icon">
              <Sprout size={26} color="#fff" />
            </div>
            <div>
              <div className="kf-brand-name">KisanFlow</div>
              <div className="kf-brand-sub">किसान प्रवाह • Trader Portal</div>
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
              <Store size={13} /> TRADER / BUYER PORTAL
            </div>

            <h2>Live Procurement & Auction Bidding</h2>
            <p>
              Access real-time lot auctions, submit bids, and track procurement decisions — all integrated with the KisanFlow mandi ecosystem.
            </p>

            <ul className="kf-feature-list">
              <li><CheckCircle2 size={18} /> Live Lot Auction Bidding</li>
              <li><CheckCircle2 size={18} /> Verified Mandi Quality Data</li>
              <li><CheckCircle2 size={18} /> Secure Procurement Contracts</li>
              <li><CheckCircle2 size={18} /> Real-Time Lot Status Updates</li>
              <li><CheckCircle2 size={18} /> Integrated Payment Tracking</li>
            </ul>
          </div>

          <div className="kf-auth-badge" style={{ background: 'rgba(196,181,253,0.2)', borderColor: 'rgba(196,181,253,0.4)', color: '#c4b5fd' }}>
            🏪 Registered Traders Only
          </div>
        </div>

        {/* ══ RIGHT ══════════════════════════════════════ */}
        <div className="kf-auth-right">
          <div className="kf-form-header">
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: '#f5f3ff', border: '1px solid #ddd6fe',
              color: '#6d28d9', fontSize: '0.72rem', fontWeight: 700,
              padding: '4px 12px', borderRadius: '99px',
              marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px',
            }}>
              <ShieldCheck size={13} /> Authorized Trader Access
            </div>
            <h2>Trader / Buyer Sign In</h2>
            <p>Log in to your registered trader account to access live auctions and procurement data.</p>
          </div>

          {/* Alert */}
          {error && (
            <div className="kf-alert kf-alert-error">
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="kf-form-group">
              <label className="kf-label">Trader Username / License No. <span className="required">*</span></label>
              <div className="kf-input-wrap">
                <span className="kf-input-icon"><User size={17} /></span>
                <input
                  id="trader-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="demo_trader or TRD-12345"
                  autoComplete="username"
                  className="kf-input"
                  required
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
                  id="trader-password"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="kf-input"
                  required
                />
                <span className="kf-input-suffix">
                  <button type="button" className="kf-eye-btn" onClick={() => setShowPass((p) => !p)}>
                    {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <label className="kf-checkbox-label" style={{ cursor: 'pointer' }}>
                <input type="checkbox" style={{ accentColor: '#6d28d9' }} /> Remember me
              </label>
            </div>

            <button
              type="submit"
              className="kf-btn kf-btn-primary"
              disabled={loading}
              style={{ background: loading ? undefined : '#6d28d9', boxShadow: loading ? undefined : '0 4px 14px rgba(109,40,217,0.35)' }}
            >
              {loading
                ? <><span className="kf-spinner" /> Authenticating…</>
                : <>Secure Login <ArrowRight size={16} /></>
              }
            </button>
          </form>

          {/* Credential hint */}
          <div className="kf-cred-box">
            <div className="kf-cred-box-title">Demo Account</div>
            <div className="kf-cred-box-row">
              <span style={{ color: '#a855f7', fontWeight: 700 }}>Username:</span> demo_trader<br />
              <span style={{ color: '#a855f7', fontWeight: 700 }}>Password:</span> Trader@123
            </div>
          </div>

          {/* Demo bypass */}
          <div style={{ marginTop: '14px' }}>
            <button type="button" className="kf-demo-btn" onClick={demoLogin}>
              <Zap size={15} /> Demo Login — Works Offline
            </button>
          </div>

          <div style={{
            marginTop: '16px', padding: '14px', background: '#fdf4ff',
            border: '1px solid #e9d5ff', borderRadius: '10px', fontSize: '0.83rem', color: '#6d28d9',
          }}>
            <b>New to KisanFlow?</b> Trader accounts are created by your Mandi Administrator. Contact your registered procurement centre to request access.
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

export default TraderLoginPage;
