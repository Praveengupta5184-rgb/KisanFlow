import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { farmerApi } from '../services/api';
import { socketService, buildCentreQueueTopic, buildCentrePricesTopic, buildFarmerQueueTopic, buildFarmerStatusTopic, buildFarmerNotificationTopic, buildFarmerMandiStatusTopic } from '../services/socket';

const FarmerContext = createContext();

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

  // ── Live Queue State from STOMP ───────────────────────────
  const [liveQueueState, setLiveQueueState] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);

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
            // Provide default lat/lng for Punjab demo if not available
            const aiData = await farmerApi.getAiRecommendations(30.900965, 75.857277);
            if (aiData && aiData.rankedCentres) {
              const aiMap = new Map(aiData.rankedCentres.map(c => [c.centreId, c]));
              enhancedCentres = enhancedCentres.map(c => ({
                ...c,
                aiScore: aiMap.get(c.id)?.compositeScore,
                aiReason: aiMap.get(c.id)?.reason,
                aiWait: aiMap.get(c.id)?.estimatedWaitMinutes
              })).sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0));
            }
          }
        } catch (e) {
          console.warn("AI recommendation failed, falling back to standard list", e);
        }
        setCentres(enhancedCentres);
        if (enhancedCentres.length > 0) setSelectedCentre(enhancedCentres[0]);
        return Promise.all(enhancedCentres.map(async centre => [centre.id, await farmerApi.getCropPrices(centre.id)]));
      })
      .then(priceEntries => setCentrePrices(Object.fromEntries(priceEntries || [])))
      .catch(err => {
        console.error('Failed to fetch centres', err);
        setCentresError('Could not load procurement centres. Please check your connection.');
      })
      .finally(() => setCentresLoading(false));
  }, [farmer?.id, wsConnected]);

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

  useEffect(() => {
    socketService.connect();

    const unsubConn = socketService.on('connection_status', ({ connected }) => {
      setWsConnected(connected);
    });

    return () => {
      unsubConn();
    };
  }, []);

  // Subscribe to the selected centre's queue topic
  useEffect(() => {
    if (!selectedCentre?.id) return;

    const topic = buildCentreQueueTopic(selectedCentre.id);
    const unsub = socketService.subscribeTopic(topic, (data) => {
      setLiveQueueState(data);
        setCentreQueue(data);
        setCentres(prev => prev.map(centre => centre.id === selectedCentre.id ? { ...centre, liveQueueCount: data.activeFarmerCount ?? data.pendingCount, activeFarmerCount: data.activeFarmerCount } : centre));
      // Update activeToken ETA if farmer has a booking at this centre
      setActiveToken(prev => {
        if (!prev || prev.centreId !== selectedCentre.id) return prev;
        return {
          ...prev,
          currentServing: data.currentServingToken,
          farmersRemaining: prev.farmersRemaining,
          etaMinutes: data.estimatedWaitMinutes || prev.etaMinutes,
        };
      });
    });

    return unsub;
  }, [selectedCentre?.id]);

  useEffect(() => {
    if (!farmer?.id) return undefined;
    const unsub = socketService.subscribeTopic(buildFarmerQueueTopic(farmer.id), (data) => {
      setPersonalQueue(data);
      setActiveToken(prev => prev ? ({
        ...prev,
        ...data,
        tokenNumber: data.token,
        currentServing: data.currentServingToken,
        farmersRemaining: data.farmersAhead,
        queuePosition: data.queuePosition,
        etaMinutes: data.estimatedWaitMinutes,
      }) : prev);
    });
    return unsub;
  }, [farmer?.id]);

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

  // Subscribe to personal farmer status updates
  useEffect(() => {
    if (!farmer?.id) return;

    const statusUnsub = socketService.subscribeTopic(
      buildFarmerStatusTopic(farmer.id),
      (data) => {
        setActiveToken(prev => prev ? { ...prev, ...data, status: data.status, tokenNumber: data.token ? `KF-${data.token.replace(/^A/, '')}` : prev.tokenNumber, centreId: data.centreId || prev.centreId } : prev);
        setNotifications(prev => [{
          id: `status-${data.bookingId}-${data.status}-${Date.now()}`,
          title: 'Token process updated',
          message: `Your token is now ${String(data.status || '').replaceAll('_', ' ')}.`,
          time: 'Just now',
          type: 'info',
          unread: true,
        }, ...prev]);
      }
    );

    const notifUnsub = socketService.subscribeTopic(
      buildFarmerNotificationTopic(farmer.id),
      (data) => {
        if (data.event === 'PRICE_UPDATED') {
          setNotifications(prev => [{
            id: `price-${data.cropType}-${Date.now()}`,
            title: 'Crop price updated',
            message: data.message || `${data.cropType} price updated.`,
            time: 'Just now',
            type: 'info',
            unread: true,
          }, ...prev]);
          return;
        }
        if (data.event === 'TURN_APPROACHING') {
          setNotifications(prev => [{
            id: `ws-${Date.now()}`,
            title: '⏰ Your Turn is Approaching!',
            message: `Token ${data.token} — estimated wait: ${data.estimatedWaitMinutes} minutes.`,
            time: 'Just now',
            type: 'travel_alert',
            unread: true,
          }, ...prev]);
        }
      }
    );

    return () => {
      statusUnsub();
      notifUnsub();
    };
  }, [farmer?.id]);

  // Subscribe to personal mandi entry/exit status updates
  useEffect(() => {
    if (!farmer?.id) return undefined;
    const unsub = socketService.subscribeTopic(
      buildFarmerMandiStatusTopic(farmer.id),
      (data) => {
        setActiveToken(prev => prev ? {
          ...prev,
          entryStatus: data.entryStatus,
          exitStatus: data.exitStatus,
          insideMandi: data.insideMandi,
          entryTime: data.entryTime || prev.entryTime,
          exitTime: data.exitTime || prev.exitTime,
        } : prev);
      }
    );
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
      }}
    >
      {children}
    </FarmerContext.Provider>
  );
};

export const useFarmer = () => useContext(FarmerContext);
