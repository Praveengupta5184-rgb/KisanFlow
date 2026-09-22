import React, { useEffect, useRef, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import { officerApi } from '../../services/api';

const SCAN_INTERVAL_MS = 300;

const QrScannerPage = () => {
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
    } catch (err) {
      setError('Camera access denied or unavailable. Please allow camera access.');
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
      // Haptic feedback if available
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data || 'Scan failed. Try again.';
      setLastResult({ success: false, message: msg });
      if (navigator.vibrate) navigator.vibrate(300);
    } finally {
      setLoading(false);
      // 3-second cooldown to avoid duplicate scans
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

  const eventColor = lastResult?.data?.event === 'FARMER_ENTERED' ? '#16a34a'
    : lastResult?.data?.event === 'FARMER_EXITED' ? '#2563eb'
    : lastResult?.data?.event === 'ALREADY_EXITED' ? '#d97706'
    : '#dc2626';

  const eventLabel = {
    FARMER_ENTERED: '✅ Entry Recorded',
    FARMER_EXITED: '🚪 Exit Recorded',
    ALREADY_EXITED: '⚠️ Already Exited',
  }[lastResult?.data?.event] || '❌ Scan Error';

  return (
    <div style={{ minHeight: '100dvh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: '#f1f5f9', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #22c55e, #16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
          📷
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>QR Gate Scanner</h2>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Scan farmer QR code at mandi gate for entry/exit</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {!scanning ? (
            <button
              onClick={startCamera}
              style={{ padding: '8px 18px', background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer' }}
            >
              Start Camera
            </button>
          ) : (
            <button
              onClick={stopCamera}
              style={{ padding: '8px 18px', background: 'rgba(239,68,68,0.2)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}
            >
              Stop
            </button>
          )}
        </div>
      </div>

      <div style={{ padding: '20px 16px', maxWidth: 480, margin: '0 auto' }}>

        {/* Camera Viewfinder */}
        <div style={{ position: 'relative', borderRadius: 20, overflow: 'hidden', background: '#000', marginBottom: 20, aspectRatio: '4/3', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
          <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover', display: scanning ? 'block' : 'none' }} muted playsInline />
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {!scanning && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.9)' }}>
              <div style={{ fontSize: '4rem', marginBottom: 12 }}>📷</div>
              <div style={{ color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center', maxWidth: 200 }}>
                Press <b style={{ color: '#22c55e' }}>Start Camera</b> to begin scanning
              </div>
            </div>
          )}

          {/* Scanning overlay */}
          {scanning && (
            <>
              {/* Corner brackets */}
              {[
                { top: 24, left: 24, borderTop: '3px solid #22c55e', borderLeft: '3px solid #22c55e' },
                { top: 24, right: 24, borderTop: '3px solid #22c55e', borderRight: '3px solid #22c55e' },
                { bottom: 24, left: 24, borderBottom: '3px solid #22c55e', borderLeft: '3px solid #22c55e' },
                { bottom: 24, right: 24, borderBottom: '3px solid #22c55e', borderRight: '3px solid #22c55e' },
              ].map((s, i) => (
                <div key={i} style={{ position: 'absolute', width: 28, height: 28, borderRadius: 4, ...s }} />
              ))}
              <div style={{ position: 'absolute', bottom: 14, left: 0, right: 0, textAlign: 'center' }}>
                <span style={{ background: 'rgba(0,0,0,0.7)', color: loading ? '#fbbf24' : '#22c55e', padding: '4px 14px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700 }}>
                  {loading ? '⏳ Processing...' : cooldown ? '🔄 Ready in 3s...' : '🔍 Scanning...'}
                </span>
              </div>
            </>
          )}
        </div>
        
        {/* Manual Token Entry */}
        {!scanning && (
          <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
            <input
              type="text"
              placeholder="Or enter Token Number manually (e.g., A127 or 127)"
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
              style={{ flex: 1, padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.2)', color: '#fff', fontSize: '1rem', outline: 'none' }}
            />
            <button
              type="submit"
              disabled={!manualToken.trim() || loading}
              style={{ padding: '12px 24px', background: !manualToken.trim() || loading ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #3b82f6, #2563eb)', color: !manualToken.trim() || loading ? '#94a3b8' : '#fff', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: !manualToken.trim() || loading ? 'not-allowed' : 'pointer' }}
            >
              Verify
            </button>
          </form>
        )}

        {/* Error */}
        {error && (
          <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 14, padding: '14px 16px', marginBottom: 16, color: '#fca5a5', fontSize: '0.88rem' }}>
            ⚠️ {error}
          </div>
        )}

        {/* Scan Result Card */}
        {lastResult && (
          <div style={{
            background: lastResult.success ? 'rgba(255,255,255,0.05)' : 'rgba(239,68,68,0.1)',
            border: `2px solid ${lastResult.success ? eventColor : '#dc2626'}`,
            borderRadius: 20,
            padding: 20,
            marginBottom: 16,
            animation: 'fadeInUp 0.3s ease',
          }}>
            {lastResult.success ? (
              <>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: eventColor, marginBottom: 6 }}>{eventLabel}</div>
                <div style={{ fontSize: '0.88rem', color: '#cbd5e1', marginBottom: 14 }}>{lastResult.data.message}</div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    { label: '👨‍🌾 Farmer', value: lastResult.data.farmerName },
                    { label: '🎟️ Token', value: lastResult.data.token },
                    { label: '🏪 Mandi', value: lastResult.data.mandiName, span: 2 },
                  ].map(({ label, value, span }) => (
                    <div key={label} style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 10, padding: '10px 12px', gridColumn: span ? `span ${span}` : undefined }}>
                      <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginBottom: 2 }}>{label}</div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{value || '—'}</div>
                    </div>
                  ))}
                </div>

                {/* Occupancy */}
                <div style={{ marginTop: 14, background: 'rgba(34,197,94,0.1)', borderRadius: 12, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#86efac', fontWeight: 700 }}>LIVE MANDI OCCUPANCY</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#22c55e' }}>{lastResult.data.currentOccupancy ?? 0} inside</div>
                  </div>
                  <div style={{ fontSize: '2rem' }}>
                    {lastResult.data.event === 'FARMER_ENTERED' ? '⬇️' : lastResult.data.event === 'FARMER_EXITED' ? '⬆️' : '—'}
                  </div>
                </div>

                {/* Times */}
                {(lastResult.data.entryTime || lastResult.data.exitTime) && (
                  <div style={{ marginTop: 10, fontSize: '0.75rem', color: '#94a3b8', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    {lastResult.data.entryTime && <span>Entry: <b style={{ color: '#f1f5f9' }}>{new Date(lastResult.data.entryTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</b></span>}
                    {lastResult.data.exitTime && <span>Exit: <b style={{ color: '#f1f5f9' }}>{new Date(lastResult.data.exitTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</b></span>}
                  </div>
                )}
              </>
            ) : (
              <div style={{ color: '#fca5a5', fontWeight: 700 }}>❌ {lastResult.message}</div>
            )}
          </div>
        )}

        {/* Instructions */}
        {!scanning && !lastResult && (
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 18 }}>
            <div style={{ fontWeight: 700, marginBottom: 12, color: '#94a3b8', fontSize: '0.85rem' }}>HOW TO USE</div>
            {[
              { icon: '📷', text: 'Press Start Camera to open the device camera' },
              { icon: '📱', text: 'Point at farmer\'s QR code shown on their phone' },
              { icon: '✅', text: 'First scan = Entry, Second scan = Exit' },
              { icon: '🔄', text: 'Occupancy updates live across all officer dashboards' },
            ].map(({ icon, text }) => (
              <div key={text} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: '1.1rem' }}>{icon}</span>
                <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>{text}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default QrScannerPage;
