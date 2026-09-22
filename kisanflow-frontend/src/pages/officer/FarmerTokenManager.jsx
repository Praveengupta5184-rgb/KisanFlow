import React, { useEffect, useState, useCallback } from 'react';
import { Search, RefreshCw, ChevronRight, CheckCircle2, Clock, AlertCircle, X, User, MapPin, Wheat } from 'lucide-react';
import { useOfficer } from '../../context/OfficerContext';
import OfficerSidebar from '../../components/officer/OfficerSidebar';
import { officerApi, farmerApi } from '../../services/api';

const STAGES = [
  { key: 'token_generated', label: 'Token Generated', color: '#64748b', bg: '#f1f5f9' },
  { key: 'arrived',         label: 'Arrived',         color: '#2563eb', bg: '#eff6ff' },
  { key: 'weighing',        label: 'Weighing',         color: '#d97706', bg: '#fffbeb' },
  { key: 'quality_check',   label: 'Quality Check',   color: '#7c3aed', bg: '#f5f3ff' },
  { key: 'procurement',     label: 'Procurement',     color: '#059669', bg: '#ecfdf5' },
  { key: 'payment_processing', label: 'Payment Processing', color: '#0891b2', bg: '#ecfeff' },
  { key: 'payment_released', label: 'Completed',      color: '#16a34a', bg: '#f0fdf4' },
];

const STAGE_MAP = Object.fromEntries(STAGES.map(s => [s.key, s]));

const StageBadge = ({ status }) => {
  const s = STAGE_MAP[status] || { label: status, color: '#64748b', bg: '#f1f5f9' };
  return (
    <span style={{
      background: s.bg, color: s.color,
      padding: '3px 10px', borderRadius: '20px',
      fontSize: '0.72rem', fontWeight: 700,
      border: `1px solid ${s.color}33`,
      whiteSpace: 'nowrap',
    }}>
      {s.label}
    </span>
  );
};

const FarmerTokenManager = () => {
  const { centres, selectedCentreId, setSelectedCentreId, liveCentreQueues } = useOfficer();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterStage, setFilterStage] = useState('all');

  // Modal state
  const [modal, setModal] = useState(null); // null | booking object
  const [activeLot, setActiveLot] = useState(null); // lot data if available
  const [lotForm, setLotForm] = useState({ weight: '', price: '', grade: 'A' });
  const [form, setForm] = useState({ stage: '', currentCounter: '', nextCounter: '', nextProcess: '', instruction: '' });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  const fetchBookings = useCallback(async (silent = false) => {
    if (!selectedCentreId) return;
    if (!silent) setLoading(true); setError('');
    try {
      const data = await officerApi.getActiveBookings(selectedCentreId);
      setBookings(Array.isArray(data) ? data : []);
    } catch {
      setError('Could not load active bookings. Check backend connection.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [selectedCentreId]);

  // Initial fetch and WebSocket-triggered fetch
  useEffect(() => { 
    // If we already have bookings, do a silent refresh to avoid UI flicker
    fetchBookings(bookings.length > 0); 
  }, [fetchBookings, liveCentreQueues[selectedCentreId]?.updatedAt]);

  const openModal = async (booking) => {
    setModal(booking);
    setForm({
      stage: booking.status,
      currentCounter: booking.currentCounter ?? '',
      nextCounter: booking.nextCounter ?? '',
      nextProcess: booking.nextProcess ?? '',
      instruction: booking.officerInstruction ?? '',
    });
    setLotForm({ weight: booking.quantityQtl || '', price: '', grade: 'A' });
    setActiveLot(null);
    try {
      const lot = await farmerApi.getLotByBooking(booking.id);
      if (lot) setActiveLot(lot);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await officerApi.updateBookingStatus(modal.id, {
        stage: form.stage,
        currentCounter: form.currentCounter !== '' ? parseInt(form.currentCounter, 10) : null,
        nextCounter: form.nextCounter !== '' ? parseInt(form.nextCounter, 10) : null,
        nextProcess: form.nextProcess || null,
        instruction: form.instruction || null,
      });
      setBookings(prev => prev.map(b => b.id === updated.id ? updated : b));
      showToast(`✅ Token KF-${updated.tokenNumber} updated to "${STAGE_MAP[updated.status]?.label || updated.status}"`);
      // Update local modal data
      setModal(updated);
    } catch (err) {
      showToast('❌ Update failed: ' + (err?.response?.data?.message || 'Check backend logs.'));
    } finally {
      setSaving(false);
    }
  };

  const handleCreateLot = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const lot = await officerApi.createLot(modal.id, lotForm.weight, lotForm.price, lotForm.grade);
      setActiveLot(lot);
      showToast(`✅ Official Lot created for KF-${modal.tokenNumber}`);
    } catch (err) {
      showToast('❌ Lot creation failed: ' + (err?.response?.data?.message || 'Check backend logs.'));
    } finally {
      setSaving(false);
    }
  };

  const handleCloseAuction = async () => {
    if (!activeLot) return;
    setSaving(true);
    try {
      const lot = await officerApi.closeAuction(activeLot.id);
      setActiveLot(lot);
      showToast(`✅ Auction closed. Status is now ${lot.status}`);
    } catch (err) {
      showToast('❌ Closing auction failed: ' + (err?.response?.data?.message || 'Check backend logs.'));
    } finally {
      setSaving(false);
    }
  };

  // Filtering
  const filtered = bookings.filter(b => {
    const q = search.trim().toLowerCase();
    const matchSearch = !q ||
      String(b.tokenNumber).includes(q.replace(/\D/g, '')) ||
      b.farmerName?.toLowerCase().includes(q) ||
      b.farmerMobileNumber?.includes(q) ||
      b.farmerVillage?.toLowerCase().includes(q);
    const matchStage = filterStage === 'all' || b.status === filterStage;
    return matchSearch && matchStage;
  });

  // Stage counts for tabs
  const stageCounts = bookings.reduce((acc, b) => {
    acc[b.status] = (acc[b.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="officer-layout">
      <OfficerSidebar />

      <main className="officer-main">
        {/* Header */}
        <header className="officer-topbar">
          <div>
            <h1 style={{ fontSize: '1.4rem', margin: 0, color: '#0f172a' }}>
              🌾 Farmer Token Management
            </h1>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
              View all farmers · Update stages · Issue counter directions in real-time
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <select
              value={selectedCentreId || ''}
              onChange={e => setSelectedCentreId(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 600, fontSize: '0.9rem' }}
            >
              {centres.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button onClick={fetchBookings} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <RefreshCw size={15} /> Refresh
            </button>
          </div>
        </header>

        <div className="officer-content">
          {/* Summary Stats Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '20px' }}>
            {[
              { label: 'Total Active', value: bookings.length, color: '#0f172a' },
              { label: 'Arrived', value: stageCounts.arrived || 0, color: '#2563eb' },
              { label: 'Weighing', value: stageCounts.weighing || 0, color: '#d97706' },
              { label: 'Quality Check', value: stageCounts.quality_check || 0, color: '#7c3aed' },
              { label: 'Procurement', value: stageCounts.procurement || 0, color: '#059669' },
              { label: 'Payment', value: (stageCounts.payment_processing || 0) + (stageCounts.payment_released || 0), color: '#0891b2' },
            ].map(stat => (
              <div key={stat.label} className="kisan-card" style={{ padding: '14px 16px', marginBottom: 0, textAlign: 'center' }}>
                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: stat.color }}>{stat.value}</div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Search + Stage Filter */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, token, mobile, village..."
                style={{ width: '100%', padding: '10px 10px 10px 34px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }}
              />
            </div>
            <select
              value={filterStage}
              onChange={e => setFilterStage(e.target.value)}
              style={{ padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600 }}
            >
              <option value="all">All Stages</option>
              {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>

          {/* Stage filter pills */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setFilterStage('all')}
              style={{
                padding: '5px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem',
                background: filterStage === 'all' ? '#0f172a' : '#f1f5f9',
                color: filterStage === 'all' ? '#fff' : '#475569',
              }}
            >All ({bookings.length})</button>
            {STAGES.map(s => (
              <button
                key={s.key}
                onClick={() => setFilterStage(s.key)}
                style={{
                  padding: '5px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem',
                  background: filterStage === s.key ? s.color : s.bg,
                  color: filterStage === s.key ? '#fff' : s.color,
                }}
              >{s.label} {stageCounts[s.key] ? `(${stageCounts[s.key]})` : ''}</button>
            ))}
          </div>

          {/* Error / Loading */}
          {error && (
            <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', color: '#be123c', padding: '12px 16px', borderRadius: '10px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={18} /> {error}
            </div>
          )}

          {loading && (
            <div style={{ textAlign: 'center', color: '#64748b', padding: '40px', fontSize: '1rem' }}>
              <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }} /> Loading farmers...
            </div>
          )}

          {/* Farmer Cards */}
          {!loading && filtered.length === 0 && !error && (
            <div style={{ textAlign: 'center', color: '#94a3b8', padding: '60px 20px' }}>
              <User size={48} color="#cbd5e1" />
              <p style={{ marginTop: '12px', fontSize: '1rem' }}>No farmers found{search ? ` for "${search}"` : ' for this centre today'}.</p>
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <div style={{ display: 'grid', gap: '12px' }}>
              {filtered.map(booking => {
                const stageInfo = STAGE_MAP[booking.status] || {};
                const currentStageIdx = STAGES.findIndex(s => s.key === booking.status);
                const isComplete = booking.status === 'payment_released';
                return (
                  <div
                    key={booking.id}
                    style={{
                      background: '#fff',
                      border: `1px solid ${stageInfo.color || '#e2e8f0'}33`,
                      borderLeft: `4px solid ${stageInfo.color || '#e2e8f0'}`,
                      borderRadius: '12px',
                      padding: '16px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      flexWrap: 'wrap',
                    }}
                  >
                    {/* Token number */}
                    <div style={{ background: '#0f172a', color: '#ffb300', borderRadius: '8px', padding: '8px 14px', fontWeight: 900, fontSize: '1.1rem', minWidth: '70px', textAlign: 'center' }}>
                      KF-{booking.tokenNumber}
                    </div>

                    {/* Farmer info */}
                    <div style={{ flex: 1, minWidth: '180px' }}>
                      <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>{booking.farmerName || 'Unknown Farmer'}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', gap: '12px', marginTop: '2px', flexWrap: 'wrap' }}>
                        <span>📱 {booking.farmerMobileNumber || '—'}</span>
                        <span><MapPin size={12} style={{ display: 'inline' }} /> {booking.farmerVillage || '—'}</span>
                        <span><Wheat size={12} style={{ display: 'inline' }} /> {booking.produceQuantity} {booking.bookingType === 'NORMAL' ? 'Qtl' : ''}</span>
                      </div>
                    </div>

                    {/* Stage pipeline mini-progress */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      {STAGES.slice(0, 6).map((s, i) => (
                        <div key={s.key} style={{
                          width: '22px', height: '6px', borderRadius: '3px',
                          background: i <= currentStageIdx ? s.color : '#e2e8f0',
                          transition: 'background 0.3s',
                        }} title={s.label} />
                      ))}
                    </div>

                    {/* Stage badge */}
                    <StageBadge status={booking.status} />

                    {/* Counter info if set */}
                    {booking.currentCounter && (
                      <span style={{ fontSize: '0.8rem', color: '#0891b2', fontWeight: 700 }}>
                        Counter #{booking.currentCounter}
                      </span>
                    )}

                    {/* Officer instruction preview */}
                    {booking.officerInstruction && (
                      <span style={{ fontSize: '0.75rem', color: '#7c3aed', background: '#f5f3ff', padding: '3px 8px', borderRadius: '6px', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={booking.officerInstruction}>
                        📋 {booking.officerInstruction}
                      </span>
                    )}

                    {/* Action button */}
                    {!isComplete ? (
                      <button
                        onClick={() => openModal(booking)}
                        style={{
                          background: 'linear-gradient(135deg, #2e7d32, #16a34a)',
                          color: '#fff', padding: '9px 18px', borderRadius: '8px',
                          border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem',
                          display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap',
                        }}
                      >
                        Update Stage <ChevronRight size={15} />
                      </button>
                    ) : (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#16a34a', fontWeight: 700, fontSize: '0.85rem' }}>
                        <CheckCircle2 size={18} /> Done
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* ── Update Stage Modal ── */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '480px', boxShadow: '0 25px 50px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            {/* Modal header */}
            <div style={{ background: 'linear-gradient(135deg, #0d3311, #1e293b)', color: '#fff', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>Update Token KF-{modal.tokenNumber}</div>
                <div style={{ fontSize: '0.82rem', opacity: 0.8, marginTop: '2px' }}>{modal.farmerName} · {modal.farmerVillage}</div>
              </div>
              <button onClick={() => setModal(null)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px' }}>
                <X size={22} />
              </button>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: 0, color: '#0f172a' }}>1. Update Stage & Counter</h4>
                {/* Stage selector */}
                <label>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>🔄 Procurement Stage</div>
                  <select
                    value={form.stage}
                    onChange={e => setForm(f => ({ ...f, stage: e.target.value }))}
                    required
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.95rem', fontWeight: 600 }}
                  >
                    {STAGES.map(s => (
                      <option key={s.key} value={s.key}>{s.label}</option>
                    ))}
                  </select>
                </label>

                {/* Current & Next counter in a row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <label>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>📍 Current Counter #</div>
                    <input
                      type="number" min="1"
                      value={form.currentCounter}
                      onChange={e => setForm(f => ({ ...f, currentCounter: e.target.value }))}
                      placeholder="e.g. 3"
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }}
                    />
                  </label>
                  <label>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>➡️ Next Counter #</div>
                    <input
                      type="number" min="1"
                      value={form.nextCounter}
                      onChange={e => setForm(f => ({ ...f, nextCounter: e.target.value }))}
                      placeholder="e.g. 7"
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }}
                    />
                  </label>
                </div>

                {/* Next process */}
                <label>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>🔜 Next Process / Section</div>
                  <input
                    type="text"
                    value={form.nextProcess}
                    onChange={e => setForm(f => ({ ...f, nextProcess: e.target.value }))}
                    placeholder="e.g. Quality Check Lab, Gate B"
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }}
                  />
                </label>

                {/* Instruction note */}
                <label>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>📋 Officer Instruction (shown to farmer)</div>
                  <textarea
                    value={form.instruction}
                    onChange={e => setForm(f => ({ ...f, instruction: e.target.value }))}
                    placeholder="e.g. Proceed to Weighbridge 2 – right from main gate"
                    rows={2}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.9rem', resize: 'vertical', boxSizing: 'border-box' }}
                  />
                </label>

                {/* Live preview */}
                {(form.nextProcess || form.instruction) && (
                  <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '10px 14px', fontSize: '0.82rem' }}>
                    <div style={{ fontWeight: 700, color: '#1d4ed8', marginBottom: '4px' }}>👁️ Preview — Farmer will see:</div>
                    {form.nextProcess && <div style={{ color: '#1e40af' }}><b>Next:</b> {form.nextProcess}{form.nextCounter ? ` (Counter ${form.nextCounter})` : ''}</div>}
                    {form.instruction && <div style={{ color: '#1e3a8a', marginTop: '2px' }}><b>Note:</b> {form.instruction}</div>}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
                  <button
                    type="submit"
                    disabled={saving}
                    style={{ padding: '8px 20px', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#fff', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem' }}
                  >
                    {saving ? '⏳ Updating...' : '✅ Update Stage'}
                  </button>
                </div>
              </form>

              {/* Lot Creation Form - Only show if past weighing stage */}
              {['quality_check', 'procurement', 'payment_processing', 'payment_released'].includes(modal.status) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: '#f0fdf4', padding: '16px', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                  <h4 style={{ margin: 0, color: '#14532d' }}>2. Official Lot & Procurement</h4>
                  
                  {activeLot ? (
                    <div>
                      <div style={{ fontSize: '0.85rem', color: '#166534', marginBottom: '12px', lineHeight: 1.5 }}>
                        Lot Number: <b>{activeLot.lotNumber}</b><br />
                        Actual Weight: <b>{activeLot.actualWeight} Qtl</b><br />
                        Base Price: <b>₹{activeLot.basePrice}/Qtl</b><br />
                        Grade: <b>{activeLot.qualityGrade}</b><br />
                        Status: <b>{activeLot.status.toUpperCase()}</b><br />
                        {activeLot.highestBidAmount && (
                           <>Highest Bid: <b>₹{activeLot.highestBidAmount}/Qtl</b><br /></>
                        )}
                      </div>
                      {activeLot.status === 'open' && (
                        <button
                          onClick={handleCloseAuction}
                          disabled={saving}
                          style={{ padding: '8px 16px', background: '#dc2626', color: '#fff', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem' }}
                        >
                           {saving ? '⏳ Closing...' : 'Close Auction'}
                        </button>
                      )}
                    </div>
                  ) : (
                    <form onSubmit={handleCreateLot} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <label>
                          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#166534', marginBottom: '6px' }}>⚖️ Actual Weight (Qtl)</div>
                          <input
                            type="number" step="0.01" min="1"
                            value={lotForm.weight}
                            onChange={e => setLotForm(f => ({ ...f, weight: e.target.value }))}
                            required
                            style={{ width: '100%', padding: '10px', border: '1px solid #86efac', borderRadius: '8px' }}
                          />
                        </label>
                        <label>
                          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#166534', marginBottom: '6px' }}>💰 Base Price (₹)</div>
                          <input
                            type="number" step="0.01" min="1"
                            value={lotForm.price}
                            onChange={e => setLotForm(f => ({ ...f, price: e.target.value }))}
                            required
                            style={{ width: '100%', padding: '10px', border: '1px solid #86efac', borderRadius: '8px' }}
                          />
                        </label>
                      </div>
                      <label>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#166534', marginBottom: '6px' }}>🔬 Quality Grade</div>
                        <select
                          value={lotForm.grade}
                          onChange={e => setLotForm(f => ({ ...f, grade: e.target.value }))}
                          style={{ width: '100%', padding: '10px', border: '1px solid #86efac', borderRadius: '8px' }}
                        >
                          <option value="A+">Grade A+ (Premium)</option>
                          <option value="A">Grade A (Standard)</option>
                          <option value="B">Grade B (Fair)</option>
                          <option value="C">Grade C (Low)</option>
                        </select>
                      </label>
                      <button
                        type="submit"
                        disabled={saving}
                        style={{ padding: '8px 20px', background: '#16a34a', color: '#fff', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem', marginTop: '4px' }}
                      >
                        {saving ? '⏳ Creating Lot...' : '✅ Create Official Lot'}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast notification */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px', background: '#0f172a', color: '#fff',
          padding: '14px 20px', borderRadius: '12px', fontWeight: 600, fontSize: '0.9rem',
          boxShadow: '0 10px 30px rgba(0,0,0,0.3)', zIndex: 3000, maxWidth: '360px',
          animation: 'slideInRight 0.3s ease-out',
        }}>
          {toast}
        </div>
      )}
    </div>
  );
};

export default FarmerTokenManager;
