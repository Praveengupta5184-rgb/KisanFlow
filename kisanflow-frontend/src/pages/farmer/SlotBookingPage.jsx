import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Truck, Scale, ArrowRight, ShieldCheck, Volume2, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useFarmer } from '../../context/FarmerContext';
import { farmerApi } from '../../services/api';

const dateToIso = (value) => {
  const bookingDate = new Date();
  const dayOffset = value.startsWith('Tomorrow') ? 1 : value.startsWith('28 Aug') ? 2 : 0;
  bookingDate.setDate(bookingDate.getDate() + dayOffset);
  return bookingDate.toISOString().split('T')[0];
};

const timeSlotToIso = (value) => {
  const match = value.match(/^(\d{2}):(\d{2})\s(AM|PM)/);
  if (!match) return '08:00:00';
  let hour = Number(match[1]);
  if (match[3] === 'PM' && hour !== 12) hour += 12;
  if (match[3] === 'AM' && hour === 12) hour = 0;
  return `${String(hour).padStart(2, '0')}:${match[2]}:00`;
};

const SlotBookingPage = () => {
  const navigate = useNavigate();
  const { t, speakText } = useLanguage();
  const { farmer, selectedCentre, setActiveToken } = useFarmer();

  const [date, setDate] = useState('Today, 26 Aug');
  const [timeSlot, setTimeSlot] = useState('12:30 PM - 01:00 PM');
  const [quantityQtl, setQuantityQtl] = useState(45);
  const [vehicleType, setVehicleType] = useState('Tractor Trolley');
  const [loading, setLoading] = useState(false);

  const dates = [
    { id: 'Today, 26 Aug', label: 'आज (Today)', sub: '26 Aug' },
    { id: 'Tomorrow, 27 Aug', label: 'कल (Tomorrow)', sub: '27 Aug' },
    { id: '28 Aug', label: 'परसों (Day 3)', sub: '28 Aug' },
  ];

  const timeSlots = [
    { id: '08:00 AM - 10:00 AM', label: '08:00 AM - 10:00 AM', status: 'red', rushText: '90% भरा (Heavy Rush)' },
    { id: '10:00 AM - 12:00 PM', label: '10:00 AM - 12:00 PM', status: 'yellow', rushText: '60% भरा (Moderate)' },
    { id: '12:30 PM - 01:00 PM', label: '12:30 PM - 01:00 PM', status: 'green', rushText: '⚡ AI Fast-Track Lane (20% Load)' },
    { id: '02:00 PM - 04:00 PM', label: '02:00 PM - 04:00 PM', status: 'green', rushText: 'सुचारू प्रवाह (Optimal)' },
  ];

  const vehicles = [
    { id: 'Tractor Trolley', label: 'ट्रैक्टर ट्रॉली', icon: '🚜' },
    { id: 'Mini Truck / Pickup', label: 'पिकअप / ट्रक', icon: '🚚' },
    { id: 'Bullock Cart / Other', label: 'अन्य वाहन', icon: '🛺' },
  ];

  const handleBooking = async (e) => {
    e.preventDefault();
    setLoading(true);
    speakText("स्लॉट बुक किया जा रहा है और टोकन उत्पन्न हो रहा है।");

    try {
      const payload = {
        farmerId: farmer?.id,
        centreId: selectedCentre?.id,
        bookingDate: dateToIso(date),
        timeSlot: timeSlotToIso(timeSlot),
        produceQuantity: Number(quantityQtl),
      };

      if (!payload.farmerId || !payload.centreId) {
        throw new Error('Farmer and procurement centre details are missing. Please log in again.');
      }
      const res = await farmerApi.bookSlot(payload);
      if (res && res.id) {
        setActiveToken({
          ...res,
          tokenNumber: `KF-${res.tokenNumber}`,
          centreName: selectedCentre?.name || 'Smart Agri Hub',
          gateNumber: 'Gate 2 (Fast-Track Lane)',
          farmersRemaining: 5,
          etaMinutes: 15,
          status: res.status || 'booked',
          currentStep: 1,
          estimatedAmountRs: quantityQtl * 2275,
        });
        speakText(`टोकन नंबर KF-${res.tokenNumber} सफलतापूर्वक बन गया है।`);
        navigate('/farmer/token-status');
      }
    } catch (err) {
      console.error(err);
      alert("Booking failed! Ensure your database is running and real API is accessible.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="farmer-layout">
      {/* Mobile Header */}
      <div className="farmer-header">
        <div>
          <h3 style={{ margin: 0, color: '#fff', fontSize: '1.1rem' }}>{t('bookSlot')}</h3>
          <span style={{ fontSize: '0.72rem', opacity: 0.85 }}>
            {selectedCentre?.name || 'Rajpura Smart Hub'}
          </span>
        </div>
        <button
          onClick={() => speakText("तारीख, समय स्लॉट और फसल की मात्रा चुनकर टोकन बनाएं।")}
          style={{ background: 'rgba(255,255,255,0.15)', color: '#ffb300', padding: '8px', borderRadius: '50%', border: 'none', cursor: 'pointer' }}
        >
          <Volume2 size={20} />
        </button>
      </div>

      {/* Desktop Topbar */}
      <div className="farmer-desktop-topbar">
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>📅 {t('bookSlot')}</h1>
          <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '2px 0 0' }}>{selectedCentre?.name || 'Select a centre first'}</p>
        </div>
        <button
          onClick={() => speakText("तारीख, समय स्लॉट और फसल की मात्रा चुनकर टोकन बनाएं।")}
          style={{ background: '#f1f5f9', color: '#2e7d32', border: '1px solid #cbd5e1', padding: '8px 14px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, cursor: 'pointer' }}
        >
          <Volume2 size={16} /> Audio
        </button>
      </div>

      <div className="farmer-body">
        <form onSubmit={handleBooking}>
          {/* Selected Center Summary Pill */}
          <div
            style={{
              background: '#f1f8e9',
              border: '1px solid #c5e1a5',
              padding: '12px 14px',
              borderRadius: '12px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: '0.75rem', color: '#558b2f', fontWeight: 700 }}>चयनित खरीद केंद्र:</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#2e7d32' }}>
                {selectedCentre?.name || 'Rajpura Smart Agri Hub'}
              </div>
            </div>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#2e7d32', background: '#dcedc8', padding: '4px 8px', borderRadius: '6px' }}>
              MSP: ₹2,275/Q
            </span>
          </div>

          {/* Date Selector */}
          <div className="kisan-card">
            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.9rem', marginBottom: '10px', color: '#1e293b' }}>
              📅 {t('selectDate')}
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {dates.map((d) => (
                <div
                  key={d.id}
                  onClick={() => setDate(d.id)}
                  style={{
                    padding: '10px',
                    borderRadius: '10px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: date === d.id ? '#2e7d32' : '#f8fafc',
                    color: date === d.id ? '#ffffff' : '#1e293b',
                    border: date === d.id ? '2px solid #1b5e20' : '1px solid #e2e8f0',
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{d.label}</div>
                  <div style={{ fontSize: '0.75rem', opacity: date === d.id ? 0.9 : 0.6 }}>{d.sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Time Slot Picker */}
          <div className="kisan-card">
            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.9rem', marginBottom: '10px', color: '#1e293b' }}>
              ⏰ {t('selectSlot')} (AI लोड पूर्वानुमान)
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {timeSlots.map((s) => (
                <div
                  key={s.id}
                  onClick={() => setTimeSlot(s.id)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: timeSlot === s.id ? (s.status === 'green' ? '#e8f5e9' : '#fff8e1') : '#ffffff',
                    border: timeSlot === s.id ? '2px solid #2e7d32' : '1px solid #e2e8f0',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {timeSlot === s.id && <CheckCircle2 size={16} color="#2e7d32" />}
                    <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{s.label}</span>
                  </div>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: s.status === 'green' ? '#16a34a' : (s.status === 'yellow' ? '#d97706' : '#dc2626'),
                    }}
                  >
                    {s.rushText}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Produce Quantity Slider & Input */}
          <div className="kisan-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>
                ⚖️ {t('quantityQtl')}
              </label>
              <span style={{ fontWeight: 800, fontSize: '1.2rem', color: '#2e7d32' }}>
                {quantityQtl} क्विंटल (Qtl)
              </span>
            </div>
            <input
              type="range"
              min={5}
              max={200}
              step={5}
              value={quantityQtl}
              onChange={(e) => setQuantityQtl(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#2e7d32', cursor: 'pointer', marginBottom: '8px' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b' }}>
              <span>5 Qtl</span>
              <span>अनुमानित भुगतान: <b>₹{(quantityQtl * 2275).toLocaleString('en-IN')}</b></span>
              <span>200 Qtl</span>
            </div>
          </div>

          {/* Vehicle Type Selection */}
          <div className="kisan-card">
            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.9rem', marginBottom: '8px', color: '#1e293b' }}>
              🚜 {t('vehicleType')}
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {vehicles.map((v) => (
                <div
                  key={v.id}
                  onClick={() => setVehicleType(v.id)}
                  style={{
                    padding: '10px',
                    borderRadius: '10px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: vehicleType === v.id ? '#e8f5e9' : '#f8fafc',
                    border: vehicleType === v.id ? '2px solid #2e7d32' : '1px solid #e2e8f0',
                  }}
                >
                  <div style={{ fontSize: '1.5rem', marginBottom: '2px' }}>{v.icon}</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700 }}>{v.label}</div>
                </div>
              ))}
            </div>
          </div>

          <button type="submit" className="btn-primary btn-full" disabled={loading} style={{ marginTop: '8px' }}>
            {loading ? 'टोकन बन रहा है...' : t('generateToken')} <ArrowRight size={20} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default SlotBookingPage;
