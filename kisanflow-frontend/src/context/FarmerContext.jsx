import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { farmerApi } from '../services/api';
import {
  socketService,
  buildCentreQueueTopic,
  buildCentrePricesTopic,
  buildCentreOccupancyTopic,
  buildFarmerQueueTopic,
  buildFarmerStatusTopic,
  buildFarmerNotificationTopic,
  buildFarmerMandiStatusTopic,
  buildFarmerLotTopic,
  buildFarmerAuctionsTopic,
  buildFarmerPaymentTopic,
} from '../services/socket';

const FarmerContext = createContext();

// Demo fallback coords (Ludhiana, Punjab) used only if geolocation is denied
const DEMO_LAT = 30.900965;
const DEMO_LNG = 75.857277;

/** Resolve real GPS position with a 5s timeout; falls back to demo coords. */
function resolveGps() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve({ lat: DEMO_LAT, lng: DEMO_LNG });
    const timer = setTimeout(() => resolve({ lat: DEMO_LAT, lng: DEMO_LNG }), 5000);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer);
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        clearTimeout(timer);
        resolve({ lat: DEMO_LAT, lng: DEMO_LNG });
      },
      { timeout: 5000, maximumAge: 60000 }
    );
  });
}

export const FarmerProvider = ({ children }) => {
  const [farmer, setFarmer] = useState(() => {
    const saved = localStorage.getItem('kisanflow_farmer');
    return saved ? JSON.parse(saved) : null;
  });

  // ── Centres ──────────────────────────────────────────────
  const [centres, setCentres] = useState([]);
  const [selectedCentre, setSelectedCentre] = useState(null);
  const [cropPrices, setCropPrices] = useState([]);
  const [centrePrices, setCentrePrices] = useState({});
  const [centreQueue, setCentreQueue] = useState(null);
  const [centresLoading, setCentresLoading] = useState(true);
  const [centresError, setCentresError] = useState(null);
  const [notifications, setNotifications] = useState([
    {
      id: 'notif-3',
      title: '🌾 MSP Rates Updated',
      message: 'गेहूं के लिए आज का आधिकारिक सरकारी न्यूनतम समर्थन मूल्य (MSP) ₹2,275/क्विंटल घोषित है।',
      time: 'Today 08:00 AM',
      type: 'info',
      unread: false,
    }
  ]);

  // ── Active Token ──────────────────────────────────────────
  const [activeToken, setActiveToken] = useState(() => {
    const saved = localStorage.getItem('kisanflow_token');
    return saved ? JSON.parse(saved) : null;
  });
  const [personalQueue, setPersonalQueue] = useState(null);

  // ── Live Queue / WebSocket ────────────────────────────────
  const [liveQueueState, setLiveQueueState] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);

  // ── Lot / Auction / Payment (live via WebSocket) ──────────
  const [lotUpdate, setLotUpdate] = useState(null);       // last LOT_CREATED payload
  const [auctionUpdate, setAuctionUpdate] = useState(null); // last BID_UPDATED / AUCTION_CLOSED payload
  const [paymentStatus, setPaymentStatus] = useState(null); // last PAYMENT_RECORDED payload
  const [farmerPayments, setFarmerPayments] = useState([]); // all payments for this farmer

  // ── AI refresh ref (so interval can call latest state) ────
  const centresRef = useRef([]);
  useEffect(() => { centresRef.current = centres; }, [centres]);

  // ─────────────────────────────────────────────────────────
  // AI Recommendations — extracted as a reusable callback
  // ─────────────────────────────────────────────────────────
  const fetchAiRecommendations = useCallback(async (existingCentres) => {
    const list = existingCentres ?? centresRef.current;
    if (!list || list.length === 0) return;
    try {
      const { lat, lng } = await resolveGps();
      const aiData = await farmerApi.getAiRecommendations(lat, lng);
      if (aiData && aiData.rankedCentres) {
        const aiMap = new Map(aiData.rankedCentres.map(c => [c.centreId, c]));
        setCentres(prev =>
          prev
            .map(c => ({
              ...c,
              aiScore: aiMap.get(c.id)?.compositeScore ?? c.aiScore,
              aiReason: aiMap.get(c.id)?.reason ?? c.aiReason,
              aiWait: aiMap.get(c.id)?.estimatedWaitMinutes ?? c.aiWait,
            }))
            .sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0))
        );
      }
    } catch (e) {
      console.warn('AI recommendation refresh failed', e);
    }
  }, []);

  // ─────────────────────────────────────────────────────────
  // Initial centres load + first AI call
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    setCentresLoading(true);
    setCentresError(null);
    if (!farmer?.id) {
      setCentresLoading(false);
      return undefined;
    }

    farmerApi.getNearbyCentres()
      .then(async data => {
        let enhancedCentres = data || [];
        try {
          if (enhancedCentres.length > 0) {
            await fetchAiRecommendations(enhancedCentres);
          }
        } catch (e) {
          console.warn('AI recommendation failed, falling back to standard list', e);
        }
        setCentres(prev => {
          // Merge AI fields if fetchAiRecommendations already ran
          const merged = enhancedCentres.map(c => {
            const existing = prev.find(p => p.id === c.id);
            return existing ? { ...c, aiScore: existing.aiScore, aiReason: existing.aiReason, aiWait: existing.aiWait } : c;
          });
          // Keep sorted by aiScore
          return merged.sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0));
        });
        if (enhancedCentres.length > 0) setSelectedCentre(enhancedCentres[0]);
        return Promise.all(enhancedCentres.map(async centre => [centre.id, await farmerApi.getCropPrices(centre.id)]));
      })
      .then(priceEntries => setCentrePrices(Object.fromEntries(priceEntries || [])))
      .catch(err => {
        console.error('Failed to fetch centres', err);
        setCentresError('Could not load procurement centres. Please check your connection.');
      })
      .finally(() => setCentresLoading(false));

    farmerApi.getFarmerPayments(farmer.id).then(pays => setFarmerPayments(pays || [])).catch(console.error);

  }, [farmer?.id, wsConnected]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─────────────────────────────────────────────────────────
  // Periodic AI refresh every 45 seconds
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!farmer?.id) return;
    const interval = setInterval(() => fetchAiRecommendations(), 45_000);
    return () => clearInterval(interval);
  }, [farmer?.id, fetchAiRecommendations]);

  // ─────────────────────────────────────────────────────────
  // Active bookings / queue / QR fetch for selected centre
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!farmer?.id || !selectedCentre?.id) return undefined;
    let cancelled = false;
    Promise.allSettled([farmerApi.getActiveBookings(farmer.id), farmerApi.getQueue(selectedCentre.id), farmerApi.getCropPrices(selectedCentre.id)])
      .then(([bookingsResult, queueResult, pricesResult]) => {
        if (cancelled) return;
        const bookings = bookingsResult.status === 'fulfilled' ? bookingsResult.value : [];
        const queue = queueResult.status === 'fulfilled' ? queueResult.value : null;
        const prices = pricesResult.status === 'fulfilled' ? pricesResult.value : [];
        setCentreQueue(queue);
        setCropPrices(prices || []);
        const booking = bookings?.[0];
        if (booking) {
          setActiveToken(prev => ({ ...prev, ...booking, tokenNumber: `KF-${booking.tokenNumber}`, centreName: selectedCentre.name, status: booking.status }));
          farmerApi.getQueueStatus(booking.id).then(queueStatus => {
            if (cancelled) return;
            setPersonalQueue(queueStatus);
            setActiveToken(prev => ({ ...prev, ...queueStatus, tokenNumber: queueStatus.token, currentServing: queueStatus.currentServingToken, farmersRemaining: queueStatus.farmersAhead, queuePosition: queueStatus.queuePosition, etaMinutes: queueStatus.estimatedWaitMinutes }));
          }).catch(() => {});
          farmerApi.getBookingQr(booking.id).then(qrData => {
            if (cancelled) return;
            setActiveToken(prev => ({ ...prev, entryStatus: qrData.entryStatus, exitStatus: qrData.exitStatus, insideMandi: qrData.insideMandi, entryTime: qrData.entryTime, exitTime: qrData.exitTime, qrId: qrData.qrId }));
          }).catch(() => {});
        } else {
          setActiveToken(null);
          setPersonalQueue(null);
        }
      })
      .catch(() => {})
      .finally(() => {});
    return () => { cancelled = true; };
  }, [farmer?.id, selectedCentre?.id, wsConnected]);

  // ─────────────────────────────────────────────────────────
  // Weather alerts
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!farmer?.id) return undefined;
    let cancelled = false;
    farmerApi.getWeatherAlerts(farmer.id).then(alerts => {
      if (cancelled) return;
      alerts.forEach(alert => setNotifications(prev => prev.some(item => item.weatherBookingId === alert.bookingId) ? prev : [{
        id: `weather-${alert.bookingId}`,
        title: '🌧️ Weather Alert',
        message: `${alert.reason} Token ${alert.token}, ${alert.bookingDate}, ${alert.timeSlot}.`,
        time: 'Just now',
        type: 'weather',
        unread: true,
        weatherBookingId: alert.bookingId,
      }, ...prev]));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [farmer?.id]);

  // ─────────────────────────────────────────────────────────
  // WebSocket — connect
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    socketService.connect();
    const unsubConn = socketService.on('connection_status', ({ connected }) => {
      setWsConnected(connected);
    });
    return () => { unsubConn(); };
  }, []);

  // ─────────────────────────────────────────────────────────
  // Subscribe to selected centre's QUEUE topic
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedCentre?.id) return;
    const topic = buildCentreQueueTopic(selectedCentre.id);
    const unsub = socketService.subscribeTopic(topic, (data) => {
      setLiveQueueState(data);
      setCentreQueue(data);
      setCentres(prev => prev.map(centre => centre.id === selectedCentre.id ? { ...centre, liveQueueCount: data.activeFarmerCount ?? data.pendingCount, activeFarmerCount: data.activeFarmerCount } : centre));
      setActiveToken(prev => {
        if (!prev || prev.centreId !== selectedCentre.id) return prev;
        return { ...prev, currentServing: data.currentServingToken, farmersRemaining: prev.farmersRemaining, etaMinutes: data.estimatedWaitMinutes || prev.etaMinutes };
      });
    });
    return unsub;
  }, [selectedCentre?.id]);

  // ─────────────────────────────────────────────────────────
  // Subscribe to OCCUPANCY for ALL centres (not just selected)
  // Updates each centre card's live inside count and re-triggers AI
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (centres.length === 0) return;
    const unsubs = centres.map(centre => {
      const topic = buildCentreOccupancyTopic(centre.id);
      return socketService.subscribeTopic(topic, (payload) => {
        const insideCount = payload?.insideCount ?? payload?.inside_count ?? 0;
        const capacity = payload?.capacity ?? 0;

        // Update the centre card in list
        setCentres(prev => prev.map(c => c.id === centre.id
          ? { ...c, liveInsideCount: insideCount, liveOccupancyPct: capacity > 0 ? Math.round((insideCount / capacity) * 100) : 0 }
          : c
        ));

        // If this is the selected centre, also update centreQueue so CentreDiscoveryPage's counter updates
        if (centre.id === selectedCentre?.id) {
          setCentreQueue(prev => prev ? { ...prev, activeFarmerCount: insideCount } : { activeFarmerCount: insideCount });
        }

        // Re-trigger AI recommendations when crowd changes (new occupancy data is an input to AI)
        fetchAiRecommendations();
      });
    });
    return () => unsubs.forEach(u => u && u());
  }, [centres.length, selectedCentre?.id, fetchAiRecommendations]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─────────────────────────────────────────────────────────
  // Subscribe to farmer's QUEUE topic
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!farmer?.id) return undefined;
    const unsub = socketService.subscribeTopic(buildFarmerQueueTopic(farmer.id), (data) => {
      setPersonalQueue(data);
      setActiveToken(prev => prev ? ({
        ...prev, ...data,
        tokenNumber: data.token,
        currentServing: data.currentServingToken,
        farmersRemaining: data.farmersAhead,
        queuePosition: data.queuePosition,
        etaMinutes: data.estimatedWaitMinutes,
      }) : prev);
    });
    return unsub;
  }, [farmer?.id]);

  // ─────────────────────────────────────────────────────────
  // Subscribe to CROP PRICES for selected centre
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedCentre?.id) return undefined;
    const unsub = socketService.subscribeTopic(buildCentrePricesTopic(selectedCentre.id), (price) => {
      setCropPrices(prev => [...prev.filter(item => item.cropType !== price.cropType), price].sort((a, b) => a.cropType.localeCompare(b.cropType)));
      setCentrePrices(prev => ({
        ...prev,
        [selectedCentre.id]: [...(prev[selectedCentre.id] || []).filter(item => item.cropType !== price.cropType), price],
      }));
    });
    return unsub;
  }, [selectedCentre?.id]);

  // ─────────────────────────────────────────────────────────
  // Subscribe to personal status + notification
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!farmer?.id) return;
    const statusUnsub = socketService.subscribeTopic(buildFarmerStatusTopic(farmer.id), (data) => {
      setActiveToken(prev => prev ? { ...prev, ...data, status: data.status, tokenNumber: data.token ? `KF-${data.token.replace(/^A/, '')}` : prev.tokenNumber, centreId: data.centreId || prev.centreId } : prev);
      setNotifications(prev => [{
        id: `status-${data.bookingId}-${data.status}-${Date.now()}`,
        title: 'Token process updated',
        message: `Your token is now ${String(data.status || '').replaceAll('_', ' ')}.`,
        time: 'Just now', type: 'info', unread: true,
      }, ...prev]);
    });
    const notifUnsub = socketService.subscribeTopic(buildFarmerNotificationTopic(farmer.id), (data, eventName) => {
      if (eventName === 'PRICE_UPDATED') {
        setNotifications(prev => [{
          id: `price-${data.cropType}-${Date.now()}`,
          title: 'Crop price updated',
          message: data.message || `${data.cropType} price updated.`,
          time: 'Just now', type: 'info', unread: true,
        }, ...prev]);
        return;
      }
      if (eventName === 'TURN_APPROACHING') {
        setNotifications(prev => [{
          id: `ws-${Date.now()}`,
          title: '⏰ Your Turn is Approaching!',
          message: `Token ${data.token} — estimated wait: ${data.estimatedWaitMinutes} minutes.`,
          time: 'Just now', type: 'travel_alert', unread: true,
        }, ...prev]);
      }
    });
    return () => { statusUnsub(); notifUnsub(); };
  }, [farmer?.id]);

  // ─────────────────────────────────────────────────────────
  // Subscribe to mandi entry/exit status
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!farmer?.id) return undefined;
    const unsub = socketService.subscribeTopic(buildFarmerMandiStatusTopic(farmer.id), (data) => {
      if (data.bookingStatus === 'expired') {
        setActiveToken(null);
        return;
      }
      setActiveToken(prev => prev ? {
        ...prev,
        entryStatus: data.entryStatus,
        exitStatus: data.exitStatus,
        insideMandi: data.insideMandi,
        entryTime: data.entryTime || prev.entryTime,
        exitTime: data.exitTime || prev.exitTime,
      } : prev);
    });
    return unsub;
  }, [farmer?.id]);

  // ─────────────────────────────────────────────────────────
  // Subscribe to LOT topic (fired when officer creates lot)
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!farmer?.id) return undefined;
    const unsub = socketService.subscribeTopic(buildFarmerLotTopic(farmer.id), (payload) => {
      setLotUpdate(payload);
      setNotifications(prev => [{
        id: `lot-${payload?.id ?? Date.now()}`,
        title: '📦 Lot Created!',
        message: `Your lot ${payload?.lotNumber ?? ''} has been created. Weight: ${payload?.actualWeight ?? '?'}q, Base Price: ₹${payload?.basePrice ?? '?'}/Q.`,
        time: 'Just now', type: 'info', unread: true,
      }, ...prev]);
    });
    return unsub;
  }, [farmer?.id]);

  // ─────────────────────────────────────────────────────────
  // Subscribe to AUCTIONS topic (BID_UPDATED + AUCTION_CLOSED)
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!farmer?.id) return undefined;
    const unsub = socketService.subscribeTopic(buildFarmerAuctionsTopic(farmer.id), (payload, event) => {
      setAuctionUpdate({ event, ...payload });

      if (event === 'BID_UPDATED') {
        // payload is now a LotResponse (with highestBidId updated) — merge into lotUpdate
        setLotUpdate(prev => prev ? { ...prev, ...payload } : payload);
        setNotifications(prev => [{
          id: `bid-${payload?.highestBidId ?? Date.now()}`,
          title: '💰 नई बोली आपके लॉट पर!',
          message: `₹${payload?.highestBidAmount ?? '?'}/क्विंटल की नई बोली लगाई गई। अभी स्वीकार कर सकते हैं।`,
          time: 'Just now', type: 'info', unread: true,
        }, ...prev]);
      } else if (event === 'BID_ACCEPTED') {
        // Farmer accepted — update lotUpdate so tracker page shows accepted state
        setLotUpdate(prev => prev ? { ...prev, ...payload } : payload);
        setNotifications(prev => [{
          id: `bid-accepted-${payload?.id ?? Date.now()}`,
          title: '✅ बोली स्वीकार की गई!',
          message: `आपकी बोली सफलतापूर्वक स्वीकार की गई। राशि: ₹${payload?.highestBidAmount ?? '?'}/Q. व्यापारी के भुगतान की प्रतीक्षा है।`,
          time: 'Just now', type: 'info', unread: true,
        }, ...prev]);
      } else if (event === 'AUCTION_CLOSED') {
        // Officer closed auction — update lot status but keep it in tracker
        setLotUpdate(prev => prev ? { ...prev, ...payload } : payload);
        setNotifications(prev => [{
          id: `auction-closed-${payload?.id ?? Date.now()}`,
          title: '⏰ नीलामी समाप्त!',
          message: `आपके लॉट की नीलामी का समय समाप्त हुआ। सर्वोच्च बोली: ₹${payload?.highestBidAmount ?? 'N/A'}/Q। अभी भी स्वीकार कर सकते हैं।`,
          time: 'Just now', type: 'info', unread: true,
        }, ...prev]);
      }
    });
    return unsub;
  }, [farmer?.id]);

  // ─────────────────────────────────────────────────────────
  // Subscribe to PAYMENT topic
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!farmer?.id) return undefined;
    const unsub = socketService.subscribeTopic(buildFarmerPaymentTopic(farmer.id), (payload) => {
      setPaymentStatus(payload);
      setFarmerPayments(prev => {
        const existing = prev.find(p => p.id === payload.id);
        if (existing) {
          return prev.map(p => p.id === payload.id ? { ...existing, ...payload } : p);
        }
        return [payload, ...prev];
      });
      setNotifications(prev => [{
        id: `payment-${payload?.id ?? Date.now()}`,
        title: '💳 Payment Update',
        message: `Payment status: ${String(payload?.status ?? '').toUpperCase()}. Amount: ₹${payload?.amount ?? '?'}`,
        time: 'Just now', type: 'info', unread: true,
      }, ...prev]);
    });
    return unsub;
  }, [farmer?.id]);

  // ── Crop Pre-screen ────────────────────────────────────────
  const [cropPrescreenResult, setCropPrescreenResult] = useState(null);

  // ── Persist ────────────────────────────────────────────────
  useEffect(() => {
    if (farmer) localStorage.setItem('kisanflow_farmer', JSON.stringify(farmer));
  }, [farmer]);

  useEffect(() => {
    if (activeToken) localStorage.setItem('kisanflow_token', JSON.stringify(activeToken));
  }, [activeToken]);

  // ── Helpers ────────────────────────────────────────────────
  const advanceStep = () => {
    if (!activeToken) return;
    setActiveToken(prev => ({ ...prev, currentStep: Math.min(6, (prev.currentStep || 1) + 1) }));
  };

  const markAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
  };

  return (
    <FarmerContext.Provider
      value={{
        farmer,
        setFarmer,
        centres,
        setCentres,
        centresLoading,
        centresError,
        selectedCentre,
        setSelectedCentre,
        cropPrices,
        centrePrices,
        centreQueue,
        activeToken,
        setActiveToken,
        liveQueueState,
        personalQueue,
        wsConnected,
        cropPrescreenResult,
        setCropPrescreenResult,
        notifications,
        setNotifications,
        advanceStep,
        markAllNotificationsRead,
        // Live lot / auction / payment state
        lotUpdate,
        auctionUpdate,
        paymentStatus,
        farmerPayments,
        setFarmerPayments,
        // AI re-fetch (can be called by child components if needed)
        fetchAiRecommendations,
      }}
    >
      {children}
    </FarmerContext.Provider>
  );
};

export const useFarmer = () => useContext(FarmerContext);
