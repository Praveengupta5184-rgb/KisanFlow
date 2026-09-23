import React, { useEffect, useRef, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import { Activity, QrCode, ScanLine } from 'lucide-react';
import OfficerSidebar from '../../components/officer/OfficerSidebar';
import { officerApi } from '../../services/api';
import { useOfficer } from '../../context/OfficerContext';
import { socketService, buildCentreOccupancyTopic } from '../../services/socket';

const SCAN_INTERVAL_MS = 300;

const QrScannerPage = () => {
  const { centres, selectedCentreId, setSelectedCentreId } = useOfficer();

  // ── Camera state ─────────────────────────────────────────────
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);

  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastScannedQr, setLastScannedQr] = useState(null);
  const [cooldown, setCooldown] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [toast, setToast] = useState('');

  // ── Live occupancy (WebSocket) ───────────────────────────────
  const [occupancy, setOccupancy] = useState(null); // { insideCount, capacity }

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 4000); };

  // Subscribe to the selected centre's occupancy topic
  useEffect(() => {
    if (!selectedCentreId) return;
    setOccupancy(null); // reset when centre changes

    const topic = buildCentreOccupancyTopic(selectedCentreId);
    const unsub = socketService.subscribeTopic(topic, (data) => {
      // data.payload = { centreId, insideCount, capacity }
      const payload = data?.payload ?? data;
      setOccupancy({
        insideCount: payload?.insideCount ?? payload?.inside_count ?? 0,
        capacity: payload?.capacity ?? 0,
      });
    });

    // Also fetch current occupancy via REST as initial value
    officerApi.getCentreOccupancy(selectedCentreId)
      .then(res => setOccupancy({ insideCount: res.insideCount ?? 0, capacity: res.capacity ?? 0 }))
      .catch(() => {});

    return unsub;
  }, [selectedCentreId]);

  // ── Camera helpers ───────────────────────────────────────────
  const startCamera = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', true);
        await videoRef.current.play();
        setScanning(true);
      }
    } catch {
      setError('Camera access denied or unavailable. Use manual token entry below.');
    }
  };

  const stopCamera = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    setScanning(false);
  };

  const handleQrData = useCallback(async (rawQrId) => {
    if (loading || cooldown || rawQrId === lastScannedQr) return;
    setLastScannedQr(rawQrId);
    setCooldown(true);
    setLoading(true);
    setLastResult(null);
    try {
      const result = await officerApi.scanQr(rawQrId);
      setLastResult({ success: true, data: result });
      if (result.event === 'GATE_ENTRY') {
        showToast(`✅ Entry Recorded: ${result.farmerName}`);
      } else if (result.event === 'GATE_EXIT') {
        showToast(`🚪 Exit Recorded: ${result.farmerName}`);
      } else if (result.event === 'ALREADY_EXITED') {
        showToast(`⚠️ Already Exited: ${result.farmerName}`);
      }
      if (result.currentOccupancy !== undefined) {
        setOccupancy(prev => ({ insideCount: result.currentOccupancy, capacity: prev?.capacity ?? 0 }));
      }
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data || 'Scan failed. Try again.';
      setLastResult({ success: false, message: msg });
      showToast('❌ ' + msg);
      if (navigator.vibrate) navigator.vibrate(300);
    } finally {
      setLoading(false);
      setTimeout(() => { setCooldown(false); setLastScannedQr(null); }, 3000);
    }
  }, [loading, cooldown, lastScannedQr]);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualToken.trim()) {
      handleQrData(manualToken.trim());
      setManualToken('');
    }
  };

  // Scan loop
  useEffect(() => {
    if (!scanning) return;
    intervalRef.current = setInterval(() => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) return;
      const ctx = canvas.getContext('2d');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });
      if (code?.data) handleQrData(code.data);
    }, SCAN_INTERVAL_MS);
    return () => clearInterval(intervalRef.current);
  }, [scanning, handleQrData]);

  useEffect(() => () => stopCamera(), []);

  // ── Derived values ───────────────────────────────────────────
  const eventColor = lastResult?.data?.event === 'GATE_ENTRY' ? '#16a34a'
    : lastResult?.data?.event === 'GATE_EXIT' ? '#2563eb'
    : lastResult?.data?.event === 'ALREADY_EXITED' ? '#d97706'
    : '#dc2626';

  const eventLabel = {
    GATE_ENTRY: '✅ Entry Recorded',
    GATE_EXIT: '🚪 Exit Recorded',
    ALREADY_EXITED: '⚠️ Already Exited',
  }[lastResult?.data?.event] || '❌ Scan Error';

  const occupancyPct = occupancy?.capacity
    ? Math.round((occupancy.insideCount / occupancy.capacity) * 100)
    : null;

  const selectedCentreName = centres.find(c => c.id === selectedCentreId)?.name || 'Select Centre';

  return (
    <div className="officer-layout">
      <OfficerSidebar />

      <main className="officer-main">
        {/* ── Topbar ──────────────────────────────────────────── */}
        <header className="officer-topbar">
          <div>
            <h1 style={{ fontSize: '1.4rem', margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
              📷 QR Gate Scanner
            </h1>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
              Camera scan or manual token entry — entry & exit management
            </p>
          </div>
          {/* Centre Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <select
              value={selectedCentreId || ''}
              onChange={e => setSelectedCentreId(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontWeight: 600, fontSize: '0.9rem' }}
            >
              {centres.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </header>

        <div className="officer-content">
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 20, maxWidth: 960, margin: '0 auto' }}>

            {/* ── Left Column: Camera + Manual ───────────────── */}
            <div>
              {/* Camera Viewfinder */}
              <div className="kisan-card" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
                <div style={{ background: 'linear-gradient(135deg,#1e293b,#0f172a)', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <ScanLine size={20} color="#22c55e" />
                  <h3 style={{ margin: 0, color: '#f1f5f9', fontSize: '1rem' }}>Live Camera Scanner</h3>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                    {!scanning ? (
                      <button
                        onClick={startCamera}
                        style={{ padding: '6px 16px', background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
                      >
                        Start Camera
                      </button>
                    ) : (
                      <button
                        onClick={stopCamera}
                        style={{ padding: '6px 16px', background: 'rgba(239,68,68,0.2)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}
                      >
                        Stop
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ position: 'relative', background: '#000', aspectRatio: '4/3' }}>
                  <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover', display: scanning ? 'block' : 'none' }} muted playsInline />
                  <canvas ref={canvasRef} style={{ display: 'none' }} />

                  {!scanning && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.92)' }}>
                      <div style={{ fontSize: '3.5rem', marginBottom: 10 }}>📷</div>
                      <div style={{ color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center', maxWidth: 200 }}>
                        Press <b style={{ color: '#22c55e' }}>Start Camera</b> to begin scanning
                      </div>
                    </div>
                  )}

                  {scanning && (
                    <>
                      {[
                        { top: 20, left: 20, borderTop: '3px solid #22c55e', borderLeft: '3px solid #22c55e' },
                        { top: 20, right: 20, borderTop: '3px solid #22c55e', borderRight: '3px solid #22c55e' },
                        { bottom: 20, left: 20, borderBottom: '3px solid #22c55e', borderLeft: '3px solid #22c55e' },
                        { bottom: 20, right: 20, borderBottom: '3px solid #22c55e', borderRight: '3px solid #22c55e' },
                      ].map((s, i) => (
                        <div key={i} style={{ position: 'absolute', width: 28, height: 28, borderRadius: 4, ...s }} />
                      ))}
                      <div style={{ position: 'absolute', bottom: 12, left: 0, right: 0, textAlign: 'center' }}>
                        <span style={{ background: 'rgba(0,0,0,0.7)', color: loading ? '#fbbf24' : '#22c55e', padding: '4px 14px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700 }}>
                          {loading ? '⏳ Processing...' : cooldown ? '🔄 Ready in 3s...' : '🔍 Scanning...'}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Manual Token Entry — always visible */}
              <div className="kisan-card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <QrCode size={20} color="#2563eb" />
                  <h3 style={{ margin: 0, fontSize: '1rem', color: '#0f172a' }}>Manual Token Entry</h3>
                </div>
                <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    placeholder="Enter Token (e.g. A127, 127, or KFQR:...)"
                    value={manualToken}
                    onChange={e => setManualToken(e.target.value)}
                    style={{ flex: 1, padding: '11px 14px', borderRadius: 10, border: '1.5px solid #cbd5e1', fontSize: '0.95rem', outline: 'none' }}
                  />
                  <button
                    type="submit"
                    disabled={!manualToken.trim() || loading}
                    style={{ padding: '11px 22px', background: !manualToken.trim() || loading ? '#e2e8f0' : 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: !manualToken.trim() || loading ? '#94a3b8' : '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: !manualToken.trim() || loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}
                  >
                    {loading ? '...' : 'Process'}
                  </button>
                </form>
                <div style={{ marginTop: 10, fontSize: '0.8rem', color: '#64748b' }}>
                  ℹ️ First scan = Entry, Second scan = Exit. System auto-detects farmer's current status.
                </div>
              </div>

              {error && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 16px', marginTop: 12, color: '#b91c1c', fontSize: '0.85rem' }}>
                  ⚠️ {error}
                </div>
              )}
            </div>

            {/* ── Right Column: Occupancy + Result ───────────── */}
            <div>
              {/* Live Occupancy Card */}
              <div className="kisan-card" style={{ padding: 24, textAlign: 'center', background: 'linear-gradient(135deg,#1e293b,#0f172a)', color: '#fff', marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <Activity size={20} color="#38bdf8" />
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600 }}>Live Mandi Occupancy</h3>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: 10 }}>{selectedCentreName}</div>
                <div style={{ fontSize: '3.2rem', fontWeight: 900, color: '#38bdf8', lineHeight: 1 }}>
                  {occupancy !== null ? occupancy.insideCount : '—'}
                </div>
                <p style={{ margin: '6px 0 0', opacity: 0.75, fontSize: '0.85rem' }}>Farmers currently inside</p>
                {occupancy?.capacity > 0 && (
                  <>
                    <div style={{ marginTop: 14, background: 'rgba(255,255,255,0.08)', borderRadius: 8, height: 8, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(100, occupancyPct)}%`, background: occupancyPct > 80 ? '#ef4444' : occupancyPct > 60 ? '#f59e0b' : '#22c55e', transition: 'width 0.6s ease', borderRadius: 8 }} />
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 6 }}>
                      {occupancyPct}% full · Capacity {occupancy.capacity}
                    </div>
                  </>
                )}
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: '0.72rem' }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', display: 'inline-block', animation: 'pulse 2s infinite' }} />
                  <span style={{ color: '#86efac' }}>Live via WebSocket</span>
                </div>
              </div>

              {/* Scan Result Card */}
              {lastResult && (
                <div style={{
                  background: lastResult.success ? '#fff' : '#fef2f2',
                  border: `2px solid ${lastResult.success ? eventColor : '#dc2626'}`,
                  borderRadius: 16,
                  padding: 20,
                  animation: 'fadeInUp 0.3s ease',
                }}>
                  {lastResult.success ? (
                    <>
                      <div style={{ fontSize: '1.25rem', fontWeight: 900, color: eventColor, marginBottom: 4 }}>{eventLabel}</div>
                      <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 14 }}>{lastResult.data.message}</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        {[
                          { label: '👨‍🌾 Farmer', value: lastResult.data.farmerName },
                          { label: '🎟️ Token', value: lastResult.data.token },
                          { label: '🏪 Mandi', value: lastResult.data.mandiName, span: 2 },
                        ].map(({ label, value, span }) => (
                          <div key={label} style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 12px', gridColumn: span ? `span ${span}` : undefined }}>
                            <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginBottom: 2 }}>{label}</div>
                            <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#0f172a' }}>{value || '—'}</div>
                          </div>
                        ))}
                      </div>
                      {(lastResult.data.entryTime || lastResult.data.exitTime) && (
                        <div style={{ marginTop: 10, fontSize: '0.75rem', color: '#94a3b8', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                          {lastResult.data.entryTime && <span>Entry: <b style={{ color: '#0f172a' }}>{new Date(lastResult.data.entryTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</b></span>}
                          {lastResult.data.exitTime && <span>Exit: <b style={{ color: '#0f172a' }}>{new Date(lastResult.data.exitTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</b></span>}
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ color: '#b91c1c', fontWeight: 700 }}>❌ {lastResult.message}</div>
                  )}
                </div>
              )}

              {!lastResult && (
                <div className="kisan-card" style={{ padding: 18 }}>
                  <div style={{ fontWeight: 700, marginBottom: 12, color: '#64748b', fontSize: '0.82rem' }}>HOW TO USE</div>
                  {[
                    { icon: '📷', text: 'Press Start Camera to open device camera' },
                    { icon: '📱', text: "Point at farmer's QR code on their phone" },
                    { icon: '✅', text: 'First scan = Entry, Second scan = Exit' },
                    { icon: '🔢', text: 'Or enter token number manually below' },
                    { icon: '🔄', text: 'Occupancy updates live across all dashboards' },
                  ].map(({ icon, text }) => (
                    <div key={text} style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'flex-start' }}>
                      <span style={{ fontSize: '1rem' }}>{icon}</span>
                      <span style={{ fontSize: '0.83rem', color: '#475569' }}>{text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: '#0f172a', color: '#fff', padding: '14px 20px', borderRadius: 12, fontWeight: 600, fontSize: '0.9rem', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', zIndex: 3000, animation: 'slideInRight 0.3s ease-out' }}>
          {toast}
        </div>
      )}

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(30px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
};

export default QrScannerPage;
