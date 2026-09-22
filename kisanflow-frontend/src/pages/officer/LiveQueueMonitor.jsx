import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Users, Scale, Clock, RefreshCw, AlertTriangle, CheckCircle2, ChevronRight, Zap } from 'lucide-react';
import { useOfficer } from '../../context/OfficerContext';
import OfficerSidebar from '../../components/officer/OfficerSidebar';
import StatusPill from '../../components/common/StatusPill';
import { officerApi } from '../../services/api';

const LiveQueueMonitor = () => {
  const navigate = useNavigate();
  const { centres, selectedCentreId, setSelectedCentreId, stageHealthData, liveCentreQueues, liveOccupancy, recentEntryExit } = useOfficer();
  const [activeBookings, setActiveBookings] = useState([]);
  const [cropPrices, setCropPrices] = useState([]);
  const [cropType, setCropType] = useState('Wheat');
  const [price, setPrice] = useState('2275');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [tokenSearch, setTokenSearch] = useState('');
  const [weatherSummary, setWeatherSummary] = useState(null);
  const [emergencySlots, setEmergencySlots] = useState([]);
  
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [selectedToken, setSelectedToken] = useState(null);
  const [stageForm, setStageForm] = useState({
    stage: '', currentCounter: '', nextCounter: '', nextProcess: '', instruction: ''
  });

  useEffect(() => {
    if (!selectedCentreId) return undefined;
    Promise.all([officerApi.getActiveBookings(selectedCentreId), officerApi.getCropPrices(selectedCentreId)])
      .then(([bookings, prices]) => {
        setActiveBookings(bookings || []);
        setCropPrices(prices || []);
        if (prices?.[0]) {
          setCropType(prices[0].cropType);
          setPrice(String(prices[0].price));
        }
      })
      .catch(() => setMessage('Live backend data unavailable. Check Docker backend and database migration.'));
    return undefined;
  }, [selectedCentreId]);

  useEffect(() => {
    if (!selectedCentreId) return undefined;
    Promise.all([officerApi.getWeatherSummary(selectedCentreId), officerApi.getEmergencySlots(selectedCentreId)])
      .then(([summary, slots]) => { setWeatherSummary(summary); setEmergencySlots(slots || []); })
      .catch(() => {});
    return undefined;
  }, [selectedCentreId]);

  const saveCropPrice = async () => {
    if (!selectedCentreId || !price) return;
    setSaving(true);
    try {
      const updated = await officerApi.updateCropPrice(selectedCentreId, cropType, price);
      setCropPrices(prev => [...prev.filter(item => item.cropType !== updated.cropType), updated]);
      setMessage(`${cropType} price updated to ₹${updated.price}/Q`);
    } catch {
      setMessage('Price update failed. Check backend connection.');
    } finally {
      setSaving(false);
    }
  };

  const openUpdateModal = (booking) => {
    setSelectedToken(booking);
    setStageForm({
      stage: booking.status,
      currentCounter: booking.currentCounter || '',
      nextCounter: booking.nextCounter || '',
      nextProcess: booking.nextProcess || '',
      instruction: booking.officerInstruction || ''
    });
    setUpdateModalOpen(true);
  };

  const handleUpdateStage = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await officerApi.updateBookingStatus(selectedToken.id, {
        stage: stageForm.stage,
        currentCounter: stageForm.currentCounter ? parseInt(stageForm.currentCounter, 10) : null,
        nextCounter: stageForm.nextCounter ? parseInt(stageForm.nextCounter, 10) : null,
        nextProcess: stageForm.nextProcess,
        instruction: stageForm.instruction
      });
      setActiveBookings(prev => prev.map(item => item.id === updated.id ? updated : item));
      setMessage(`Token KF-${updated.tokenNumber} updated to ${stageForm.stage.replaceAll('_', ' ')}`);
      setUpdateModalOpen(false);
    } catch {
      setMessage('Token update failed. Please check inputs.');
    } finally {
      setSaving(false);
    }
  };

  const currentCentre = centres.find((c) => c.id === selectedCentreId) || {
    id: null,
    name: 'No Centre Selected',
    capacityStatus: 'green',
    estWaitMinutes: 0,
    weather: 'Unknown',
    mspRate: 0,
    currentServingToken: null,
    liveQueueCount: 0,
  };
  const stages = stageHealthData[currentCentre.id] || [];
  const liveQueue = liveCentreQueues[currentCentre.id];
  const currentServingToken = liveQueue?.currentServingToken || currentCentre.currentServingToken;
  const activeFarmerCount = liveQueue?.activeFarmerCount ?? currentCentre.liveQueueCount ?? 0;
  const waitingTokens = liveQueue?.nextUpTokens || [];
  const occupancy = liveOccupancy[currentCentre.id];
  const insideCount = occupancy?.insideCount ?? 0;
  const occupancyCap = occupancy?.capacity ?? currentCentre.capacity ?? 0;
  const occupancyPct = occupancyCap > 0 ? Math.round((insideCount / occupancyCap) * 100) : 0;
  const centreEntryExit = recentEntryExit.filter(e => e.centreId === currentCentre.id).slice(0, 5);

  const counters = [];

  return (
    <div className="officer-layout">
      <OfficerSidebar />

      <main className="officer-main">
        {/* Top Header */}
        <header className="officer-topbar">
          <div>
            <h1 style={{ fontSize: '1.4rem', margin: 0, color: '#0f172a' }}>
              Live Queue & Counter Telemetry Monitor
            </h1>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
              Real-time WebSocket feed per procurement yard
            </p>
          </div>

          {/* Mandi Picker Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Select Center:</span>
            <select
              value={selectedCentreId}
              onChange={(e) => setSelectedCentreId(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontWeight: 700,
                fontSize: '0.9rem',
                outline: 'none',
                background: '#ffffff',
              }}
            >
              {centres.length === 0 ? (
                <option value="">Loading Centres...</option>
              ) : (
                centres.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))
              )}
            </select>
          </div>
        </header>

        <div className="officer-content">
          {/* Centre Overview Card */}
          <div
            className="kisan-card"
            style={{
              background: 'linear-gradient(135deg, #0d3311, #1e293b)',
              color: '#ffffff',
              padding: '24px',
              marginBottom: '24px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h2 style={{ fontSize: '1.4rem', color: '#ffffff', margin: 0 }}>{currentCentre.name}</h2>
                  <StatusPill status={currentCentre.capacityStatus} waitMinutes={currentCentre.estWaitMinutes} />
                </div>
                <div style={{ fontSize: '0.85rem', opacity: 0.85, marginTop: '4px' }}>
                  Weather: {currentCentre.weather} • Daily MSP: ₹{currentCentre.mspRate}/Quintal
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ background: 'rgba(255,255,255,0.1)', padding: '10px 16px', borderRadius: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Current Serving Token</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#ffb300' }}>
                    {currentServingToken || '—'}
                  </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.1)', padding: '10px 16px', borderRadius: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Waiting in Queue</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: currentCentre.capacityStatus === 'red' ? '#ef4444' : '#22c55e' }}>
                    {activeFarmerCount} Farmers
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="kisan-card" style={{ padding: '20px', marginBottom: '24px', border: '1px solid #fbbf24', background: '#fffbeb' }}>
            <h3 style={{ fontSize: '1.1rem', margin: '0 0 14px', color: '#78350f' }}>🌧️ Weather Emergency & Rescheduling</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', marginBottom: '14px' }}>
              {[
                ['Weather Affected', weatherSummary?.weatherAffected ?? 0],
                ['Rescheduling Requested', weatherSummary?.reschedulingRequested ?? 0],
                ['Auto Rescheduled', weatherSummary?.automaticallyRescheduled ?? 0],
                ['Cancelled', weatherSummary?.cancelled ?? 0],
                ['Pending', weatherSummary?.pending ?? 0],
              ].map(([label, value]) => <div key={label} style={{ background: '#fff', borderRadius: '8px', padding: '9px', color: '#78350f' }}><small>{label}</small><br /><b>{value}</b></div>)}
            </div>
            {emergencySlots.length > 0 && <div style={{ display: 'grid', gap: '6px' }}>
              {emergencySlots.map(slot => <div key={slot.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 10px', background: '#fff', borderRadius: '6px', fontSize: '0.82rem', color: '#78350f' }}><span>{slot.slotDate} - {slot.timeSlot}</span><b>{slot.reservedCount} / {slot.capacity} Used</b></div>)}
            </div>}
            {!emergencySlots.length && <span style={{ color: '#92400e', fontSize: '0.82rem' }}>Emergency slots will be provisioned automatically when weather rescheduling starts.</span>}
          </div>

          <div className="kisan-card" style={{ padding: '16px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
              <span><b>Active Farmers</b><br /><strong>{activeFarmerCount}</strong></span>
              <span><b>Waiting Tokens</b><br /><strong>{waitingTokens.length ? waitingTokens.join(', ') : '—'}</strong></span>
              <span><b>Last Updated</b><br /><strong>{liveQueue?.updatedAt ? new Date(liveQueue.updatedAt).toLocaleTimeString() : '—'}</strong></span>
            </div>
          </div>

          {/* ── MANDI OCCUPANCY WIDGET ── */}
          <div className="kisan-card" style={{ padding: '20px', marginBottom: '24px', border: '2px solid #22c55e', background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', color: '#14532d' }}>🏪 Mandi Physical Occupancy</h3>
                <div style={{ fontSize: '0.72rem', color: '#15803d', marginTop: 2 }}>Live count — DB source of truth</div>
              </div>
              <button
                onClick={() => navigate('/officer/qr-scanner')}
                style={{ padding: '8px 14px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}
              >
                📷 QR Scanner
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: '2.8rem', fontWeight: 900, color: '#15803d' }}>{insideCount}</span>
              <span style={{ fontSize: '0.95rem', color: '#166534', fontWeight: 600 }}>inside mandi{occupancyCap > 0 ? ` / ${occupancyCap} capacity` : ''}</span>
              {occupancyCap > 0 && (
                <span style={{ marginLeft: 'auto', fontSize: '0.85rem', fontWeight: 800, color: occupancyPct > 85 ? '#dc2626' : occupancyPct > 60 ? '#d97706' : '#16a34a' }}>
                  {occupancyPct}%
                </span>
              )}
            </div>
            {occupancyCap > 0 && (
              <div style={{ height: 8, background: '#bbf7d0', borderRadius: 6, overflow: 'hidden', marginBottom: 12 }}>
                <div style={{ height: '100%', width: `${Math.min(occupancyPct, 100)}%`, background: occupancyPct > 85 ? '#dc2626' : occupancyPct > 60 ? '#f59e0b' : '#22c55e', borderRadius: 6, transition: 'width 0.5s ease' }} />
              </div>
            )}
            {centreEntryExit.length > 0 ? (
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#15803d', marginBottom: 6 }}>RECENT GATE ACTIVITY</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {centreEntryExit.map(ev => (
                    <div key={ev.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', borderRadius: 8, padding: '7px 10px', fontSize: '0.8rem' }}>
                      <span style={{ fontWeight: 700, color: ev.event === 'FARMER_ENTERED' ? '#16a34a' : '#2563eb' }}>
                        {ev.event === 'FARMER_ENTERED' ? '⬇️ ENTRY' : '⬆️ EXIT'}
                      </span>
                      <span style={{ color: '#1e293b' }}>{ev.farmerName} · <b>{ev.token}</b></span>
                      <span style={{ color: '#64748b', fontSize: '0.72rem' }}>{ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '0.8rem', color: '#86efac' }}>No gate activity yet today. Entry/exit events will appear here live.</div>
            )}
          </div>

          {/* Stage-wise Real-Time Flow Pipeline */}
          <div className="kisan-card" style={{ padding: '20px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', color: '#0f172a' }}>
              🔄 Live Funnel Flow (Stage-by-Stage Telemetry)
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
              {stages.map((st, i) => (
                <div
                  key={i}
                  style={{
                    background: st.status === 'bottleneck' ? '#fff1f2' : (st.status === 'moderate' ? '#fffbeb' : '#f0fdf4'),
                    border: st.status === 'bottleneck' ? '2px solid #f87171' : '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '14px',
                    position: 'relative',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>
                    Stage {i + 1}
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a', marginBottom: '8px' }}>
                    {st.stage}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#334155', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <span>In-Queue: <b>{st.queueLen} vehicles</b></span>
                    <span>Avg Time: <b>{st.avgTime}</b></span>
                    <span>Staff Active: <b>{st.activeStaff} operators</b></span>
                  </div>
                  <div style={{ marginTop: '10px' }}>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: st.status === 'bottleneck' ? '#fee2e2' : '#dcfce7',
                        color: st.status === 'bottleneck' ? '#b91c1c' : '#15803d',
                      }}
                    >
                      {st.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="kisan-card" style={{ padding: '20px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', margin: '0 0 12px', color: '#0f172a' }}>Mandi Controls: Crop Prices & Farmer Tokens</h3>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <select value={cropType} onChange={(e) => setCropType(e.target.value)} style={{ padding: '9px', border: '1px solid #cbd5e1', borderRadius: '8px' }}>
                {['Wheat', 'Paddy', 'Mustard', 'Cotton', 'Sugarcane', 'Maize'].map(crop => <option key={crop}>{crop}</option>)}
              </select>
              <input type="number" min="1" value={price} onChange={(e) => setPrice(e.target.value)} style={{ width: '130px', padding: '9px', border: '1px solid #cbd5e1', borderRadius: '8px' }} aria-label="Crop price per quintal" />
              <button type="button" className="btn-primary" onClick={saveCropPrice} disabled={saving}>{saving ? 'Saving...' : 'Update Price / Q'}</button>
            </div>
            <div style={{ marginTop: '14px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {cropPrices.map(item => <span key={item.cropType} style={{ background: '#f0fdf4', color: '#166534', padding: '6px 10px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700 }}>{item.cropType}: ₹{item.price}/Q</span>)}
            </div>
            <div style={{ marginTop: '18px', display: 'grid', gap: '8px' }}>
              <input value={tokenSearch} onChange={(e) => setTokenSearch(e.target.value)} placeholder="Enter token number, e.g. 101 or KF-101" style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px' }} aria-label="Search farmer token" />
              {activeBookings.filter(booking => {
                const query = tokenSearch.trim().toLowerCase();
                return !query || String(booking.tokenNumber).includes(query.replace(/\D/g, '')) || booking.farmerName?.toLowerCase().includes(query) || booking.farmerMobileNumber?.includes(query);
              }).map(booking => {
                return <div key={booking.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                  <span><b>{booking.farmerName || 'Farmer'}</b><br /><small>KF-{booking.tokenNumber} · {booking.farmerVillage || 'Village unavailable'} · {booking.status.replaceAll('_', ' ')}</small></span>
                  <button type="button" className="btn-secondary" onClick={() => openUpdateModal(booking)}>Update Stage</button>
                </div>;
              })}
              {!activeBookings.length && <span style={{ color: '#64748b', fontSize: '0.85rem' }}>No active tokens loaded for this mandi.</span>}
              {activeBookings.length > 0 && tokenSearch && !activeBookings.filter(booking => {
                const query = tokenSearch.trim().toLowerCase();
                return String(booking.tokenNumber).includes(query.replace(/\D/g, '')) || booking.farmerName?.toLowerCase().includes(query) || booking.farmerMobileNumber?.includes(query);
              }).length && <span style={{ color: '#b91c1c', fontSize: '0.85rem' }}>No farmer or token found in this mandi's active queue.</span>}
            </div>
            {message && <div style={{ marginTop: '10px', color: '#166534', fontSize: '0.82rem' }}>{message}</div>}
          </div>

          {updateModalOpen && selectedToken && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
              <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', width: '400px', maxWidth: '90%' }}>
                <h3 style={{ marginTop: 0 }}>Update Token KF-{selectedToken.tokenNumber}</h3>
                <form onSubmit={handleUpdateStage} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <label>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Stage</span>
                    <select value={stageForm.stage} onChange={e => setStageForm({...stageForm, stage: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
                      <option value="token_generated">Token Generated</option>
                      <option value="arrived">Arrived</option>
                      <option value="weighing">Weighing</option>
                      <option value="quality_check">Quality Check</option>
                      <option value="procurement">Procurement</option>
                      <option value="payment_processing">Payment Processing</option>
                      <option value="payment_released">Completed</option>
                    </select>
                  </label>
                  <label>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Current Counter (Optional)</span>
                    <input type="number" value={stageForm.currentCounter} onChange={e => setStageForm({...stageForm, currentCounter: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                  </label>
                  <label>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Next Process</span>
                    <input type="text" value={stageForm.nextProcess} onChange={e => setStageForm({...stageForm, nextProcess: e.target.value})} placeholder="e.g. Quality Check" style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                  </label>
                  <label>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Next Counter</span>
                    <input type="number" value={stageForm.nextCounter} onChange={e => setStageForm({...stageForm, nextCounter: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                  </label>
                  <label>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Instruction Note</span>
                    <textarea value={stageForm.instruction} onChange={e => setStageForm({...stageForm, instruction: e.target.value})} placeholder="e.g. Go to Counter 10" rows={2} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                  </label>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                    <button type="button" onClick={() => setUpdateModalOpen(false)} style={{ padding: '8px 16px', background: '#e2e8f0', borderRadius: '6px', border: 'none', cursor: 'pointer' }}>Cancel</button>
                    <button type="submit" style={{ padding: '8px 16px', background: '#16a34a', color: '#fff', borderRadius: '6px', border: 'none', cursor: 'pointer' }} disabled={saving}>{saving ? 'Updating...' : 'Update'}</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Active Counters Status Breakdown */}
          <div className="kisan-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.1rem', margin: 0, color: '#0f172a' }}>
                ⚖️ Active Weighbridges & Counters Status
              </h3>
              <button
                onClick={() => navigate('/officer/resource-optimization')}
                className="btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
              >
                + Request Additional Mobile Counter
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              {counters.length > 0 ? counters.map((c) => (
                <div
                  key={c.id}
                  style={{
                    border: c.status === 'fault' ? '2px solid #ef4444' : '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '16px',
                    background: c.status === 'fault' ? '#fff1f2' : '#ffffff',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#0f172a' }}>{c.name}</h4>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Operator: {c.operator}</span>
                    </div>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        background: c.status === 'active' ? '#dcfce7' : '#fee2e2',
                        color: c.status === 'active' ? '#166534' : '#991b1b',
                      }}
                    >
                      {c.status === 'active' ? '🟢 ONLINE' : '🔴 FAULT / STALLED'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#334155', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                    <span>Processed Today: <b>{c.processedCount} loads</b></span>
                    <span>Speed: <b>{c.speedPerHr}</b></span>
                  </div>
                </div>
              )) : (
                <div style={{ color: '#64748b', fontSize: '0.9rem' }}>Real-time hardware telemetry integration pending.</div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LiveQueueMonitor;
