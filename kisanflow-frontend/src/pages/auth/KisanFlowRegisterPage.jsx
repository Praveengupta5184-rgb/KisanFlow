import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import {
  Sprout, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle,
  Phone, User, Wheat, MapPin, ShieldCheck, Info,
  Eye, EyeOff, ChevronDown, UserCog, Store,
} from 'lucide-react';
import { useFarmer } from '../../context/FarmerContext';
import { farmerApi } from '../../services/api';

/* ── Constants ─────────────────────────────── */
const API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
  'http://localhost:8080/api';

const CROP_OPTIONS = [
  { value: 'Wheat',     label: 'Wheat (गेहूं)' },
  { value: 'Paddy',     label: 'Paddy / Rice (धान)' },
  { value: 'Mustard',   label: 'Mustard (सरसों)' },
  { value: 'Cotton',    label: 'Cotton (कपास)' },
  { value: 'Sugarcane', label: 'Sugarcane (गन्ना)' },
  { value: 'Maize',     label: 'Maize (मक्का)' },
  { value: 'Soybean',   label: 'Soybean (सोयाबीन)' },
  { value: 'Groundnut', label: 'Groundnut (मूंगफली)' },
  { value: 'Other',     label: 'Other' },
];

const LANG_OPTIONS = [
  { value: 'hi', label: 'हिन्दी (Hindi)' },
  { value: 'en', label: 'English' },
  { value: 'pb', label: 'ਪੰਜਾਬੀ (Punjabi)' },
  { value: 'mr', label: 'मराठी (Marathi)' },
  { value: 'gu', label: 'ગુજરાતી (Gujarati)' },
];

const STATES = [
  'Punjab', 'Haryana', 'Uttar Pradesh', 'Madhya Pradesh', 'Rajasthan',
  'Maharashtra', 'Gujarat', 'Bihar', 'Andhra Pradesh', 'Telangana',
  'Karnataka', 'Tamil Nadu', 'West Bengal', 'Odisha', 'Chhattisgarh', 'Other',
];

const ROLES = [
  { key: 'FARMER',  label: 'Farmer',       subLabel: 'किसान',    icon: <Wheat size={16} /> },
  { key: 'OFFICER', label: 'Officer',      subLabel: 'अधिकारी',  icon: <UserCog size={16} /> },
  { key: 'TRADER',  label: 'Trader/Buyer', subLabel: 'व्यापारी', icon: <Store size={16} /> },
];

const STEP_LABELS = ['Account', 'Personal', 'Details', 'Verify'];

/* ── Sub-components ────────────────────────── */
const SelectField = ({ id, value, onChange, options, placeholder }) => (
  <div className="kf-select-wrap">
    <select id={id} value={value} onChange={onChange} className="kf-select">
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value || o} value={o.value || o}>{o.label || o}</option>
      ))}
    </select>
    <ChevronDown size={15} className="kf-select-arrow" />
  </div>
);

const FormField = ({ label, required, children, hint }) => (
  <div className="kf-form-group">
    <label className="kf-label">
      {label} {required && <span className="required">*</span>}
    </label>
    {children}
    {hint && <div style={{ fontSize: '0.74rem', color: '#6b7280', marginTop: '4px' }}>{hint}</div>}
  </div>
);

/* ══════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════ */
const KisanFlowRegisterPage = () => {
  const navigate = useNavigate();
  const { setFarmer } = useFarmer();

  const [step, setStep]       = useState(1); // 1..4
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');

  /* ── STEP 1 — Account Details ─────────────── */
  const [selectedRole, setSelectedRole] = useState('FARMER');
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail]               = useState('');
  const [preferredLanguage, setLanguage] = useState('hi');

  /* ── STEP 2 — Personal Details ────────────── */
  const [firstName, setFirstName]   = useState('');
  const [lastName, setLastName]     = useState('');
  const [fatherName, setFatherName] = useState('');
  const [gender, setGender]         = useState('');
  const [dob, setDob]               = useState('');
  const [address, setAddress]       = useState('');
  const [state, setState]           = useState('');
  const [district, setDistrict]     = useState('');
  const [tehsil, setTehsil]         = useState('');
  const [village, setVillage]       = useState('');

  /* ── STEP 3 — Role-specific Details ─────────── */
  const [cropType, setCropType]       = useState('Wheat');
  const [preferredMandi, setPreferredMandi] = useState('');

  /* ── STEP 4 — Verify ─────────────────────── */
  const [otpSent, setOtpSent]       = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpCode, setOtpCode]       = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [termsAccepted, setTerms]   = useState(false);
  const [dataConsent, setConsent]   = useState(false);

  /* ── Helpers ─────────────────────────────── */
  const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

  const validateStep = () => {
    setError('');
    if (step === 1) {
      if (!mobileNumber || mobileNumber.length < 10)
        return setError('Please enter a valid 10-digit mobile number.') || false;
      return true;
    }
    if (step === 2) {
      if (!firstName.trim()) return setError('First Name is required.') || false;
      if (!lastName.trim())  return setError('Last Name is required.') || false;
      if (!village.trim())   return setError('Village / Town is required.') || false;
      return true;
    }
    if (step === 3) return true;
    if (step === 4) {
      if (!otpVerified) return setError('Please verify your mobile number with OTP first.') || false;
      if (!termsAccepted) return setError('Please accept the Terms & Conditions to continue.') || false;
      if (!dataConsent) return setError('Please accept the Data Consent to continue.') || false;
      return true;
    }
    return true;
  };

  const goNext = () => { if (validateStep()) setStep((s) => Math.min(s + 1, 4)); };
  const goBack = () => { setError(''); setStep((s) => Math.max(s - 1, 1)); };

  /* ── OTP ─────────────────────────────────── */
  const handleSendOtp = async () => {
    if (!mobileNumber || mobileNumber.length < 10) {
      setError('Please enter a valid 10-digit mobile number before sending OTP.');
      return;
    }
    setError(''); setOtpLoading(true);
    try {
      const res = await farmerApi.sendOtp(mobileNumber);
      const devOtp = res?.developmentOtp || '123456';
      setOtpCode(devOtp);
      setOtpSent(true);
      setSuccess(`OTP sent! Demo code: ${devOtp}`);
    } catch {
      setOtpCode('123456');
      setOtpSent(true);
      setSuccess('Sandbox mode — OTP: 123456');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length < 4) { setError('Please enter the OTP code.'); return; }
    setError(''); setOtpLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/v1/auth/otp/verify`, {
        mobileNumber, otp: otpCode, purpose: 'register'
      });
      if (response.status === 200) {
        setOtpVerified(true);
        setSuccess('Mobile number verified successfully!');
      }
    } catch (err) {
      if (err.response?.status === 409) {
        setError(err.response?.data?.message || 'An account for this mobile number already exists. Please login.');
        return;
      }
      const bypass = otpCode === '123456';
      if (bypass) {
        setOtpVerified(true);
        setSuccess('Mobile number verified (demo bypass).');
      } else {
        setError(err.response?.data?.message || 'Invalid or expired OTP. Please try again.');
      }
    } finally {
      setOtpLoading(false);
    }
  };

  /* ── Submit Registration ─────────────────── */
  const handleSubmit = async () => {
    if (!validateStep()) return;
    setLoading(true); setError('');
    try {
      const payload = {
        name: fullName || firstName,
        mobileNumber,
        village: village || district || state || 'N/A',
        cropType: cropType || 'Wheat',
        preferredLanguage: preferredLanguage || 'hi',
      };
      const response = await axios.post(`${API_BASE_URL}/v1/auth/farmer/register`, payload, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.status === 201) {
        setSuccess('Registration successful! Please log in with your mobile number and OTP.');
        setTimeout(() => navigate('/login'), 2500);
      }
    } catch (err) {
      if (err.response?.status === 409) {
        setError('An account with this mobile number already exists. Please log in instead.');
      } else if (!err.response) {
        setError('Unable to reach server. Please check your connection and try again.');
      } else {
        setError(err.response?.data?.message || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  /* ── Step Status Helper ──────────────────── */
  const stepStatus = (n) => {
    if (n < step) return 'done';
    if (n === step) return 'active';
    return 'pending';
  };

  return (
    <div className="kf-auth-page">
      <div className="kf-auth-inner">

        {/* ══ LEFT PANEL ══════════════════════════════════ */}
        <div className="kf-auth-left">
          <div className="kf-brand-logo">
            <div className="kf-brand-icon">
              <Sprout size={26} color="#fff" />
            </div>
            <div>
              <div className="kf-brand-name">KisanFlow</div>
              <div className="kf-brand-sub">किसान प्रवाह • Digital Mandi Registration</div>
            </div>
          </div>

          <div className="kf-auth-tagline">
            <h2>Register Once. Access All Mandi Services.</h2>
            <p>
              Create your KisanFlow account in just a few steps and unlock digital access to your nearest procurement centre.
            </p>

            <ul className="kf-feature-list">
              <li><CheckCircle2 size={18} /> Instant Booking & Token Generation</li>
              <li><CheckCircle2 size={18} /> Real-Time Procurement Stage Tracking</li>
              <li><CheckCircle2 size={18} /> Direct Benefit Transfer (DBT) Updates</li>
              <li><CheckCircle2 size={18} /> AI Crop Quality Pre-Screening</li>
              <li><CheckCircle2 size={18} /> Multilingual Support</li>
            </ul>

            {/* Step overview */}
            <div style={{ marginTop: '28px', borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '22px' }}>
              <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', marginBottom: '14px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Registration Steps
              </div>
              {['Account Details', 'Personal Details', 'Role-Specific Info', 'Verify & Submit'].map((s, i) => (
                <div key={s} style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  marginBottom: '10px', opacity: step > i + 1 ? 1 : step === i + 1 ? 1 : 0.5,
                }}>
                  <div style={{
                    width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: step > i + 1 ? '#4ade80' : step === i + 1 ? '#fff' : 'rgba(255,255,255,0.2)',
                    color: step > i + 1 ? '#15803d' : step === i + 1 ? '#1b5e20' : 'rgba(255,255,255,0.6)',
                    fontSize: '0.75rem', fontWeight: 800,
                  }}>
                    {step > i + 1 ? '✓' : i + 1}
                  </div>
                  <span style={{ fontSize: '0.86rem', color: step === i + 1 ? '#fff' : 'rgba(255,255,255,0.75)', fontWeight: step === i + 1 ? 600 : 400 }}>
                    {s}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="kf-auth-badge">🌾 Smart India Hackathon 2026</div>
        </div>

        {/* ══ RIGHT PANEL ══════════════════════════════════ */}
        <div className="kf-auth-right">
          {/* Step indicator */}
          <div className="kf-steps">
            {STEP_LABELS.map((label, i) => (
              <div key={label} className={`kf-step ${stepStatus(i + 1)}`}>
                <div className="kf-step-circle">
                  {step > i + 1 ? <CheckCircle2 size={14} /> : i + 1}
                </div>
                <div className="kf-step-label">{label}</div>
              </div>
            ))}
          </div>

          {/* Header */}
          <div className="kf-form-header">
            <h2>
              {step === 1 && 'Account Details'}
              {step === 2 && 'Personal Information'}
              {step === 3 && (selectedRole === 'FARMER' ? 'Farmer Details' : 'Role Information')}
              {step === 4 && 'Verify & Submit'}
            </h2>
            <p>
              {step === 1 && 'Select your role and enter your contact details.'}
              {step === 2 && 'Tell us about yourself so we can set up your profile.'}
              {step === 3 && (selectedRole === 'FARMER' ? 'Enter your crop and mandi preferences.' : 'Account information for your role.')}
              {step === 4 && 'Verify your mobile number and agree to complete registration.'}
            </p>
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

          {/* ══════════════ STEP 1 — Account Details ══════════════ */}
          {step === 1 && (
            <div>
              {/* Role selector */}
              <div className="kf-form-group">
                <label className="kf-label">Select Your Role <span className="required">*</span></label>
                <div className="kf-role-tabs tabs-3">
                  {ROLES.map(({ key, label, subLabel, icon }) => (
                    <button
                      key={key}
                      type="button"
                      className={`kf-role-tab${selectedRole === key ? ' active' : ''}`}
                      onClick={() => setSelectedRole(key)}
                    >
                      {icon}
                      <span>
                        <span style={{ display: 'block', lineHeight: 1.1 }}>{label}</span>
                        <span style={{ display: 'block', fontSize: '0.68rem', opacity: 0.7 }}>{subLabel}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Mobile */}
              <FormField label="Mobile Number" required hint="A 10-digit OTP will be sent to this number for verification.">
                <div className="kf-phone-group">
                  <span className="kf-phone-prefix">🇮🇳 +91</span>
                  <input
                    id="reg-mobile"
                    type="tel"
                    maxLength={10}
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                    placeholder="98765 43210"
                    autoComplete="tel"
                    className="kf-phone-input"
                  />
                </div>
              </FormField>

              {/* Email (optional) */}
              <FormField label="Email Address" hint="Optional — for account recovery notifications.">
                <div className="kf-input-wrap">
                  <input
                    id="reg-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@email.com"
                    autoComplete="email"
                    className="kf-input"
                  />
                </div>
              </FormField>

              {/* Language */}
              <FormField label="Preferred Language">
                <SelectField
                  id="reg-lang"
                  value={preferredLanguage}
                  onChange={(e) => setLanguage(e.target.value)}
                  options={LANG_OPTIONS}
                />
              </FormField>
            </div>
          )}

          {/* ══════════════ STEP 2 — Personal Details ══════════════ */}
          {step === 2 && (
            <div>
              <div className="kf-form-grid-2">
                <FormField label="First Name" required>
                  <div className="kf-input-wrap">
                    <input
                      id="reg-first"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Gurpreet"
                      className="kf-input"
                    />
                  </div>
                </FormField>

                <FormField label="Last Name" required>
                  <div className="kf-input-wrap">
                    <input
                      id="reg-last"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Singh"
                      className="kf-input"
                    />
                  </div>
                </FormField>

                <FormField label="Father's Name">
                  <div className="kf-input-wrap">
                    <input
                      id="reg-father"
                      type="text"
                      value={fatherName}
                      onChange={(e) => setFatherName(e.target.value)}
                      placeholder="Sukhwinder Singh"
                      className="kf-input"
                    />
                  </div>
                </FormField>

                <FormField label="Gender">
                  <SelectField
                    id="reg-gender"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    options={[
                      { value: 'Male', label: 'Male (पुरुष)' },
                      { value: 'Female', label: 'Female (महिला)' },
                      { value: 'Other', label: 'Other' },
                    ]}
                    placeholder="Select Gender"
                  />
                </FormField>

                <FormField label="Date of Birth">
                  <div className="kf-input-wrap">
                    <input
                      id="reg-dob"
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="kf-input"
                      max={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </FormField>

                <FormField label="State" required>
                  <SelectField
                    id="reg-state"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    options={STATES.map((s) => ({ value: s, label: s }))}
                    placeholder="Select State"
                  />
                </FormField>

                <FormField label="District">
                  <div className="kf-input-wrap">
                    <input
                      id="reg-district"
                      type="text"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      placeholder="Kapurthala"
                      className="kf-input"
                    />
                  </div>
                </FormField>

                <FormField label="Tehsil / Block">
                  <div className="kf-input-wrap">
                    <input
                      id="reg-tehsil"
                      type="text"
                      value={tehsil}
                      onChange={(e) => setTehsil(e.target.value)}
                      placeholder="Sultanpur Lodhi"
                      className="kf-input"
                    />
                  </div>
                </FormField>

                <div className="kf-col-span-2">
                  <FormField label="Village / Town" required>
                    <div className="kf-input-wrap">
                      <input
                        id="reg-village"
                        type="text"
                        value={village}
                        onChange={(e) => setVillage(e.target.value)}
                        placeholder="e.g. Sultanpur Lodhi"
                        className="kf-input"
                      />
                    </div>
                  </FormField>
                </div>

                <div className="kf-col-span-2">
                  <FormField label="Full Address">
                    <div className="kf-input-wrap" style={{ alignItems: 'flex-start' }}>
                      <textarea
                        id="reg-address"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="House No., Street, Colony"
                        rows={2}
                        className="kf-input"
                        style={{ resize: 'none', paddingTop: '12px' }}
                      />
                    </div>
                  </FormField>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════ STEP 3 — Role-Specific Details ══════════════ */}
          {step === 3 && (
            <div>
              {selectedRole === 'FARMER' && (
                <>
                  <div className="kf-alert kf-alert-info" style={{ marginBottom: '20px' }}>
                    <Info size={15} style={{ flexShrink: 0, marginTop: '1px' }} />
                    <span>
                      Provide your primary crop and nearest mandi. You can update these preferences from your dashboard after registration.
                    </span>
                  </div>

                  <FormField label="Primary Crop" required>
                    <SelectField
                      id="reg-crop"
                      value={cropType}
                      onChange={(e) => setCropType(e.target.value)}
                      options={CROP_OPTIONS}
                      placeholder="Select Crop"
                    />
                  </FormField>

                  <FormField
                    label="Preferred Mandi / Procurement Centre"
                    hint="You can choose from available mandis after logging in using the Discovery page."
                  >
                    <div className="kf-input-wrap">
                      <span className="kf-input-icon"><MapPin size={16} /></span>
                      <input
                        id="reg-mandi"
                        type="text"
                        value={preferredMandi}
                        onChange={(e) => setPreferredMandi(e.target.value)}
                        placeholder="e.g. Kapurthala Grain Market"
                        className="kf-input"
                      />
                    </div>
                  </FormField>

                  <div className="kf-alert kf-alert-warn" style={{ marginTop: '12px' }}>
                    <ShieldCheck size={15} style={{ flexShrink: 0, marginTop: '1px' }} />
                    <span>
                      <b>Important:</b> Official Lot creation, weighing, and quality assessment are handled by your Mandi Officer after token verification. Farmers do not create official Lots.
                    </span>
                  </div>
                </>
              )}

              {(selectedRole === 'OFFICER' || selectedRole === 'TRADER') && (
                <div>
                  <div className="kf-contact-box">
                    <div style={{ fontSize: '2rem', marginBottom: '12px' }}>
                      {selectedRole === 'OFFICER' ? '🛡️' : '🏪'}
                    </div>
                    <h3>
                      {selectedRole === 'OFFICER' ? 'Officer Account Registration' : 'Trader Account Registration'}
                    </h3>
                    <p>
                      {selectedRole === 'OFFICER'
                        ? 'Officer accounts are created and managed by your District Agricultural Officer (DAO) or Mandi Administrator. Please contact your department to receive login credentials.'
                        : 'Trader/Buyer accounts are provisioned by the Mandi Administration. Please contact the Mandi Officer or Administrator at your registered procurement centre to request an account.'}
                    </p>
                    <div style={{
                      marginTop: '16px', background: '#e0f2fe', borderRadius: '8px',
                      padding: '12px', fontSize: '0.84rem', color: '#0c4a6e',
                    }}>
                      <b>Contact:</b> Mandi Helpdesk: <b>1800-180-1551</b> (Toll-Free)
                    </div>
                  </div>

                  <div style={{ marginTop: '16px', textAlign: 'center' }}>
                    <p style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '12px' }}>
                      Already have credentials?
                    </p>
                    <Link
                      to="/login"
                      className="kf-btn kf-btn-primary"
                      style={{ display: 'inline-flex', width: 'auto', padding: '10px 24px', textDecoration: 'none' }}
                    >
                      Go to Login Page
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══════════════ STEP 4 — Verify & Submit ══════════════ */}
          {step === 4 && (
            <div>
              {/* OTP Verification */}
              <div style={{
                background: '#f9fafb', border: '1px solid #e5e7eb',
                borderRadius: '12px', padding: '18px', marginBottom: '20px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.92rem' }}>
                    Mobile Verification
                  </div>
                  {otpVerified && <span className="kf-verified-badge"><CheckCircle2 size={13} /> Verified</span>}
                </div>

                <div style={{ fontSize: '0.84rem', color: '#6b7280', marginBottom: '12px' }}>
                  Verifying: <b style={{ color: '#0f172a' }}>+91-{mobileNumber}</b>
                </div>

                {!otpVerified && (
                  <>
                    <div className="kf-otp-row" style={{ marginBottom: '12px' }}>
                      <div className="kf-form-group">
                        <label className="kf-label">OTP Code</label>
                        <div className="kf-input-wrap">
                          <input
                            id="verify-otp"
                            type="text"
                            maxLength={6}
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                            placeholder="6-digit OTP"
                            className="kf-input"
                            style={{ letterSpacing: '4px', fontWeight: 700 }}
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={otpSent ? handleVerifyOtp : handleSendOtp}
                        className="kf-btn kf-btn-primary kf-btn-sm"
                        disabled={otpLoading}
                        style={{ marginBottom: '0', alignSelf: 'flex-end', padding: '13px 16px', whiteSpace: 'nowrap' }}
                      >
                        {otpLoading ? <span className="kf-spinner" /> : (otpSent ? 'Verify OTP' : 'Send OTP')}
                      </button>
                    </div>

                    {otpSent && (
                      <div style={{ fontSize: '0.76rem', color: '#6b7280' }}>
                        Didn't receive it?{' '}
                        <button type="button" className="kf-link" style={{ fontSize: '0.76rem' }} onClick={handleSendOtp}>
                          Resend OTP
                        </button>
                        <span style={{ marginLeft: '8px', color: '#f59e0b', fontWeight: 600 }}>
                          Demo bypass: 123456
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Summary */}
              <div style={{
                background: '#f0fdf4', border: '1px solid #bbf7d0',
                borderRadius: '12px', padding: '16px', marginBottom: '20px',
              }}>
                <div style={{ fontWeight: 700, color: '#15803d', marginBottom: '10px', fontSize: '0.88rem' }}>
                  Registration Summary
                </div>
                {[
                  { label: 'Role', value: ROLES.find(r => r.key === selectedRole)?.label },
                  { label: 'Name', value: fullName || firstName },
                  { label: 'Mobile', value: `+91-${mobileNumber}` },
                  { label: 'Village', value: village || '—' },
                  { label: 'State', value: state || '—' },
                  selectedRole === 'FARMER' && { label: 'Primary Crop', value: cropType },
                ].filter(Boolean).map(({ label, value }) => (
                  <div key={label} style={{ display: 'flex', gap: '8px', fontSize: '0.84rem', color: '#374151', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600, minWidth: '100px', color: '#15803d' }}>{label}:</span>
                    <span>{value}</span>
                  </div>
                ))}
              </div>

              {/* Consent */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                <label className="kf-checkbox-label">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTerms(e.target.checked)}
                  />
                  <span>
                    I have read and agree to the{' '}
                    <button type="button" className="kf-link">Terms & Conditions</button>
                    {' '}and{' '}
                    <button type="button" className="kf-link">Privacy Policy</button>
                    {' '}of KisanFlow.
                  </span>
                </label>
                <label className="kf-checkbox-label">
                  <input
                    type="checkbox"
                    checked={dataConsent}
                    onChange={(e) => setConsent(e.target.checked)}
                  />
                  <span>
                    I consent to the collection and use of my data for agricultural procurement services as described in the Privacy Policy.
                  </span>
                </label>
              </div>

              {/* Submit */}
              <button
                type="button"
                onClick={handleSubmit}
                className="kf-btn kf-btn-primary"
                disabled={loading || !otpVerified}
              >
                {loading
                  ? <><span className="kf-spinner" /> Submitting Registration…</>
                  : <><CheckCircle2 size={17} /> Complete Registration</>
                }
              </button>
            </div>
          )}

          {/* ── Navigation Buttons ─────────────────── */}
          <div style={{
            display: 'flex', gap: '10px', marginTop: '20px',
            paddingTop: '16px', borderTop: '1px solid #f0f0f0',
          }}>
            {step > 1 && step < 4 && (
              <button type="button" onClick={goBack} className="kf-btn kf-btn-outline" style={{ flex: 1 }}>
                <ArrowLeft size={16} /> Back
              </button>
            )}
            {step < 4 && !(step === 3 && selectedRole !== 'FARMER') && (
              <button type="button" onClick={goNext} className="kf-btn kf-btn-primary" style={{ flex: 2 }}>
                Continue <ArrowRight size={16} />
              </button>
            )}
            {step === 3 && selectedRole !== 'FARMER' && (
              <button type="button" onClick={goBack} className="kf-btn kf-btn-outline" style={{ flex: 1 }}>
                <ArrowLeft size={16} /> Back
              </button>
            )}
          </div>

          {/* Bottom links */}
          <div className="kf-auth-footer">
            Already have an account?{' '}
            <Link to="/login" className="kf-link">Sign In</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KisanFlowRegisterPage;
