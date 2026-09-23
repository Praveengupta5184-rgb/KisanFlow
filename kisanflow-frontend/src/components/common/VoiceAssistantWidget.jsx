import React, { useState, useEffect, useRef } from 'react';
import { Phone, PhoneCall, PhoneOff, Volume2, Sparkles, X, CheckCircle2, Radio, Play, RotateCcw } from 'lucide-react';
import { safeJsonParse } from '../../utils/storage';

const VoiceAssistantWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [callState, setCallState] = useState('idle'); // 'idle' | 'calling' | 'prompting' | 'key_pressed' | 'answering' | 'completed'
  const [selectedLanguage, setSelectedLanguage] = useState('hi-IN'); // 'hi-IN' | 'en-IN'
  const [logs, setLogs] = useState([]);
  const [callDuration, setCallDuration] = useState(0);
  const timerRef = useRef(null);
  const logContainerRef = useRef(null);

  const [position, setPosition] = useState(() => {
    const saved = localStorage.getItem('ivr_widget_pos');
    return safeJsonParse(saved, { x: 0, y: 0 });
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, lastX: position.x, lastY: position.y, dragging: false });

  const handlePointerDown = (e) => {
    dragRef.current.startX = e.clientX;
    dragRef.current.startY = e.clientY;
    dragRef.current.dragging = false;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (e.buttons !== 1 && e.pointerType === 'mouse') return;
    if (dragRef.current.startX === 0) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      dragRef.current.dragging = true;
      setIsDragging(true);
      // Constrain roughly within screen
      let newX = dragRef.current.lastX + dx;
      let newY = dragRef.current.lastY + dy;
      setPosition({ x: newX, y: newY });
    }
  };

  const handlePointerUp = (e) => {
    if (dragRef.current.dragging) {
      dragRef.current.lastX = position.x;
      dragRef.current.lastY = position.y;
      localStorage.setItem('ivr_widget_pos', JSON.stringify({ x: position.x, y: position.y }));
    } else {
      setIsOpen(true);
    }
    dragRef.current.startX = 0;
    dragRef.current.dragging = false;
    setTimeout(() => setIsDragging(false), 50);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // Call timer effect
  useEffect(() => {
    if (callState !== 'idle' && callState !== 'completed') {
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callState]);

  // Helper to add timestamped log
  const appendLog = (text, type = 'info') => {
    const timeString = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs((prev) => [...prev, { text, type, time: timeString, id: Date.now() + Math.random() }]);
  };

  // Helper to speak out loud using browser native SpeechSynthesis
  const speakUtterance = (text, langCode = 'hi-IN') => {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) {
        console.warn('SpeechSynthesis is not supported by this browser.');
        resolve();
        return;
      }

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = langCode;
      utterance.rate = 0.95;
      utterance.pitch = 1.0;

      // Select matching voice if available
      const voices = window.speechSynthesis.getVoices();
      const matchVoice = voices.find(
        (v) => v.lang.startsWith(langCode.substring(0, 2)) || v.lang.includes('IN')
      );
      if (matchVoice) {
        utterance.voice = matchVoice;
      }

      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();

      window.speechSynthesis.speak(utterance);
    });
  };

  // Reset or End Call
  const handleEndCall = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setCallState('idle');
    setCallDuration(0);
    appendLog('⏹️ Call Session Ended by User', 'system');
  };

  // 1. Core IVR Call Simulation Flow
  const handleSimulateCall = async () => {
    if (callState !== 'idle' && callState !== 'completed') return;

    // Reset state & logs
    setLogs([]);
    setCallDuration(0);
    setCallState('calling');

    // Step 1: Initial call setup
    appendLog('🔴 Incoming Call Initiated...', 'danger');

    // Configure language script
    const isHindi = selectedLanguage === 'hi-IN';
    const firstPrompt = isHindi
      ? 'KisanFlow me aapka swagat hai. Apna live token status janne ke liye 1 dabayein.'
      : 'Welcome to KisanFlow. To check your live token status, please press 1.';

    // Step 2: Trigger Native Speech Utterance
    setCallState('prompting');
    appendLog(`🔊 IVR Prompt [${isHindi ? 'हिन्दी' : 'English'}]: "${firstPrompt}"`, 'ivr');
    await speakUtterance(firstPrompt, selectedLanguage);

    // Step 3: Simulated delay before farmer input
    setCallState('key_pressed');
    appendLog('⌨️ Farmer pressed Key: 1', 'input');

    // Make API call to backend IVR Simulator
    let backendResponseText = '';
    try {
      const baseUrl = `${import.meta.env.VITE_API_BASE_URL || '/api'}/v1`;
      // Try to get farmer ID from localStorage or use a default one for the demo
      const rawFarmerStr = window.localStorage.getItem('farmerData');
      let farmerId = '00000000-0000-0000-0000-000000000000';
      if (rawFarmerStr) {
        try {
           const f = safeJsonParse(rawFarmerStr, null);
           if (f && f.id) farmerId = f.id;
        } catch(e){}
      }
      
      const response = await fetch(`${baseUrl}/ivr/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ farmerId: farmerId, option: '1' })
      });
      const data = await response.json();
      backendResponseText = data.response;
    } catch (err) {
      console.error(err);
      backendResponseText = isHindi
        ? 'Aapka active token number A127 hai. Kripya counter number teen par sampark karein.'
        : 'Your active token number is A127. Please proceed to Counter Number 3.';
    }

    // Step 4: Trigger Second Native Speech Action declaring token status from backend
    setTimeout(() => {
      setCallState('answering');
      appendLog(`🔊 IVR Response: "${backendResponseText}"`, 'ivr');
      speakUtterance(backendResponseText, selectedLanguage).then(() => {
        // Step 5: Final completion update
        setTimeout(() => {
          setCallState('completed');
          appendLog('✅ Interactive Voice Call Completed successfully.', 'success');
        }, 1000);
      });
    }, 800);
  };

  const formatSeconds = (sec) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        id="open-ivr-simulator-btn"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          transform: `translate(${position.x}px, ${position.y}px)`,
          zIndex: 10000,
          background: 'linear-gradient(135deg, #0d3311, #1b5e20)',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '32px',
          boxShadow: '0 10px 25px rgba(13, 51, 17, 0.45), 0 0 0 3px #ffb300',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          border: 'none',
          cursor: isDragging ? 'grabbing' : 'grab',
          touchAction: 'none',
          fontFamily: 'inherit',
          transition: isDragging ? 'none' : 'box-shadow 0.2s ease',
        }}
        title="Interactive IVR Voice Accessibility Simulator"
      >
        <div
          style={{
            background: '#ffb300',
            color: '#0d3311',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
          }}
        >
          <PhoneCall size={20} />
        </div>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 800, letterSpacing: '0.3px', color: '#fff' }}>
            IVR Voice Simulator
          </div>
          <div style={{ fontSize: '0.72rem', color: '#fef08a', fontWeight: 600 }}>
            Live Multi-Lingual Sandbox
          </div>
        </div>
      </button>

      {/* High-Contrast Modal Dashboard Overlay */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10001,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <div
            id="ivr-modal-container"
            style={{
              width: '100%',
              maxWidth: '680px',
              background: '#0f172a',
              color: '#f8fafc',
              borderRadius: '24px',
              border: '2px solid #334155',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.1)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '92vh',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                background: 'linear-gradient(135deg, #0d3311 0%, #14532d 100%)',
                padding: '20px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '2px solid #22c55e',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    background: '#ffb300',
                    color: '#0d3311',
                    borderRadius: '12px',
                    padding: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(255, 179, 0, 0.35)',
                  }}
                >
                  <PhoneCall size={26} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.3px' }}>
                      Multi-Lingual Voice IVR Simulator
                    </h3>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        background: '#22c55e',
                        color: '#052e16',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      High Fidelity
                    </span>
                  </div>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#bbf7d0' }}>
                    Interactive Voice Response & Accessibility for Low-Literacy Farmers
                  </p>
                </div>
              </div>

              <button
                id="close-ivr-modal-btn"
                type="button"
                onClick={() => {
                  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                  setIsOpen(false);
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.12)',
                  border: 'none',
                  color: '#ffffff',
                  borderRadius: '50%',
                  width: '38px',
                  height: '38px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={22} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Controls Bar: Language Switcher & Call Button */}
              <div
                style={{
                  background: '#1e293b',
                  padding: '16px',
                  borderRadius: '16px',
                  border: '1px solid #334155',
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '14px',
                }}
              >
                {/* Language Picker */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#94a3b8' }}>
                    Language:
                  </span>
                  <div style={{ display: 'flex', gap: '6px', background: '#0f172a', padding: '4px', borderRadius: '10px', border: '1px solid #334155' }}>
                    <button
                      type="button"
                      onClick={() => setSelectedLanguage('hi-IN')}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: 'none',
                        background: selectedLanguage === 'hi-IN' ? '#22c55e' : 'transparent',
                        color: selectedLanguage === 'hi-IN' ? '#052e16' : '#cbd5e1',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                      }}
                    >
                      🇮🇳 हिन्दी (hi-IN)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedLanguage('en-IN')}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: 'none',
                        background: selectedLanguage === 'en-IN' ? '#22c55e' : 'transparent',
                        color: selectedLanguage === 'en-IN' ? '#052e16' : '#cbd5e1',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                      }}
                    >
                      🌐 English (en-IN)
                    </button>
                  </div>
                </div>

                {/* Call Action Button */}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    id="simulate-call-menu-btn"
                    type="button"
                    onClick={handleSimulateCall}
                    disabled={callState !== 'idle' && callState !== 'completed'}
                    style={{
                      background: callState !== 'idle' && callState !== 'completed'
                        ? '#475569'
                        : 'linear-gradient(135deg, #15803d, #22c55e)',
                      color: '#ffffff',
                      border: 'none',
                      padding: '12px 20px',
                      borderRadius: '12px',
                      fontWeight: 800,
                      fontSize: '0.95rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: callState !== 'idle' && callState !== 'completed' ? 'not-allowed' : 'pointer',
                      boxShadow: '0 4px 14px rgba(34, 197, 94, 0.4)',
                    }}
                  >
                    <PhoneCall size={18} />
                    Simulate Call Menu (Hindi/English)
                  </button>

                  {callState !== 'idle' && (
                    <button
                      type="button"
                      onClick={handleEndCall}
                      style={{
                        background: '#dc2626',
                        color: '#ffffff',
                        border: 'none',
                        padding: '12px 16px',
                        borderRadius: '12px',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                      }}
                      title="End Simulation"
                    >
                      <PhoneOff size={16} /> End
                    </button>
                  )}
                </div>
              </div>

              {/* Live Call Telemetry Status */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: '12px',
                }}
              >
                <div style={{ background: '#1e293b', padding: '12px 16px', borderRadius: '12px', border: '1px solid #334155' }}>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                    Call Status
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: callState === 'completed' ? '#22c55e' : (callState === 'idle' ? '#94a3b8' : '#f59e0b'), display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                    <span
                      style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: callState === 'completed' ? '#22c55e' : (callState === 'idle' ? '#64748b' : '#ef4444'),
                        display: 'inline-block',
                      }}
                    />
                    {callState === 'idle' && 'READY'}
                    {callState === 'calling' && 'DIALING...'}
                    {callState === 'prompting' && 'PLAYING MENU'}
                    {callState === 'key_pressed' && 'DTMF INPUT'}
                    {callState === 'answering' && 'SPEAKING TOKEN'}
                    {callState === 'completed' && 'COMPLETED'}
                  </div>
                </div>

                <div style={{ background: '#1e293b', padding: '12px 16px', borderRadius: '12px', border: '1px solid #334155' }}>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                    Call Duration
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc', marginTop: '4px' }}>
                    {formatSeconds(callDuration)}
                  </div>
                </div>

                <div style={{ background: '#1e293b', padding: '12px 16px', borderRadius: '12px', border: '1px solid #334155' }}>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                    Target Farmer
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#38bdf8', marginTop: '4px' }}>
                    +91 98765 43210
                  </div>
                </div>
              </div>

              {/* Dynamic Console / Logger View State (High Contrast Presentation Display) */}
              <div
                style={{
                  background: '#020617',
                  borderRadius: '16px',
                  border: '2px solid #1e293b',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div
                  style={{
                    background: '#0f172a',
                    padding: '10px 16px',
                    borderBottom: '1px solid #1e293b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                    </div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.5px' }}>
                      LIVE IVR EVENT STREAM
                    </span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>
                    speechSynthesis.hi-IN
                  </span>
                </div>

                <div
                  ref={logContainerRef}
                  style={{
                    height: '240px',
                    padding: '16px',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  }}
                >
                  {logs.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b', textAlign: 'center', gap: '8px' }}>
                      <Volume2 size={32} opacity={0.5} />
                      <div style={{ fontSize: '1rem', fontWeight: 600 }}>No active call session</div>
                      <div style={{ fontSize: '0.8rem' }}>Click "Simulate Call Menu" above to launch live spoken IVR interaction</div>
                    </div>
                  ) : (
                    logs.map((log) => {
                      let bg = 'rgba(255, 255, 255, 0.04)';
                      let border = '#334155';
                      let textColor = '#f8fafc';
                      let fontSize = '1.05rem';

                      if (log.type === 'danger') {
                        bg = 'rgba(239, 68, 68, 0.15)';
                        border = '#ef4444';
                        textColor = '#fca5a5';
                        fontSize = '1.15rem';
                      } else if (log.type === 'ivr') {
                        bg = 'rgba(56, 189, 248, 0.15)';
                        border = '#38bdf8';
                        textColor = '#bae6fd';
                        fontSize = '1.1rem';
                      } else if (log.type === 'input') {
                        bg = 'rgba(245, 158, 11, 0.18)';
                        border = '#f59e0b';
                        textColor = '#fde68a';
                        fontSize = '1.15rem';
                      } else if (log.type === 'success') {
                        bg = 'rgba(34, 197, 94, 0.2)';
                        border = '#22c55e';
                        textColor = '#86efac';
                        fontSize = '1.2rem';
                      }

                      return (
                        <div
                          key={log.id}
                          style={{
                            padding: '10px 14px',
                            background: bg,
                            borderLeft: `4px solid ${border}`,
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'baseline',
                            justifyContent: 'space-between',
                            gap: '12px',
                          }}
                        >
                          <div style={{ color: textColor, fontWeight: 700, fontSize, lineHeight: 1.4 }}>
                            {log.text}
                          </div>
                          <span style={{ fontSize: '0.72rem', color: '#64748b', flexShrink: 0 }}>
                            {log.time}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Real-Time Result Verification Card */}
              {callState === 'completed' && (
                <div
                  style={{
                    background: 'linear-gradient(135deg, rgba(22, 101, 52, 0.4), rgba(5, 46, 22, 0.6))',
                    border: '2px solid #22c55e',
                    borderRadius: '16px',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    animation: 'slideUp 0.3s ease-out',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ background: '#22c55e', color: '#052e16', borderRadius: '50%', padding: '8px' }}>
                      <CheckCircle2 size={24} />
                    </div>
                    <div>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff' }}>
                        Token Dispatched: A127
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#bbf7d0' }}>
                        Counter: #3 • Status: Called via IVR Audio • Gate: Fast-Track 2
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => speakUtterance('Aapka active token number A127 hai. Kripya counter number teen par sampark karein.', selectedLanguage)}
                    style={{
                      background: '#ffb300',
                      color: '#0d3311',
                      border: 'none',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    <Volume2 size={16} /> Replay Voice
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default VoiceAssistantWidget;
