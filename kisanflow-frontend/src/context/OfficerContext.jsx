import React, { createContext, useContext, useState, useEffect } from 'react';
import { officerApi } from '../services/api';
import { socketService, buildCentreQueueTopic, buildCentreOccupancyTopic, buildCentreEntryExitTopic } from '../services/socket';
import { safeJsonParse } from '../utils/storage';

const OfficerContext = createContext();

export const OfficerProvider = ({ children }) => {
  const [officer, setOfficer] = useState(() => {
    const saved = localStorage.getItem('kisanflow_officer');
    return safeJsonParse(saved);
  });

  const [centres, setCentres] = useState([]);
  const [selectedCentreId, setSelectedCentreId] = useState(null);
  const [centresLoading, setCentresLoading] = useState(true);
  const [centresError, setCentresError] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [alertsError, setAlertsError] = useState(null);
  const [stageHealthData, setStageHealthData] = useState({});
  const [wsConnected, setWsConnected] = useState(false);
  const [liveCentreQueues, setLiveCentreQueues] = useState({});
  const [liveOccupancy, setLiveOccupancy] = useState({}); // centreId → { insideCount, capacity }
  const [recentEntryExit, setRecentEntryExit] = useState([]); // last 20 events across all centres

  useEffect(() => {
    // Load centres & alerts whenever the officer session exists.
    // Route-level ProtectedRoute already enforces role; double-checking localStorage
    // blocks data when role is stored differently (e.g. 'OFFICER' vs OFFICER).
    if (!officer?.username && !officer?.role) {
      setCentresLoading(false);
      setAlertsLoading(false);
      return undefined;
    }

    // Fetch Officer Profile
    officerApi.getOfficerProfile()
      .then(data => {
        setOfficer(prev => ({ ...prev, ...data }));
      })
      .catch(err => console.error("Failed to fetch officer profile:", err));

    // Fetch centres
    setCentresLoading(true);
    officerApi.getCentres()
      .then(data => {
        setCentres(data || []);
        if (data && data.length > 0) setSelectedCentreId(prev => prev || data[0].id);
      })
      .catch(err => {
        console.error('Failed to load centres:', err);
        setCentresError('Could not load procurement centres.');
      })
      .finally(() => setCentresLoading(false));

    // Fetch alerts
    setAlertsLoading(true);
    officerApi.getAlerts()
      .then(data => setAlerts(data || []))
      .catch(err => {
        console.error('Failed to load alerts:', err);
        setAlertsError('Could not load crisis alerts.');
      })
      .finally(() => setAlertsLoading(false));

    // Connect WebSocket
    socketService.connect();
    const unsubConn = socketService.on('connection_status', ({ connected }) => setWsConnected(connected));
    return () => unsubConn();
  }, [officer?.username, wsConnected]);

  // Subscribe to all centres' queue state as soon as they load
  useEffect(() => {
    if (!centres.length) return;
    const queueUnsubs = centres.map(c =>
      socketService.subscribeTopic(buildCentreQueueTopic(c.id), (queueState) => {
        setLiveCentreQueues(prev => ({ ...prev, [c.id]: queueState }));
      })
    );
    const occupancyUnsubs = centres.map(c =>
      socketService.subscribeTopic(buildCentreOccupancyTopic(c.id), (data) => {
        setLiveOccupancy(prev => ({ ...prev, [c.id]: { insideCount: data.insideCount, capacity: data.capacity } }));
      })
    );
    const entryExitUnsubs = centres.map(c =>
      socketService.subscribeTopic(buildCentreEntryExitTopic(c.id), (data) => {
        setRecentEntryExit(prev => [{ ...data, id: Date.now() }, ...prev].slice(0, 20));
      })
    );
    return () => {
      [...queueUnsubs, ...occupancyUnsubs, ...entryExitUnsubs].forEach(fn => fn());
    };
  }, [centres]);


  const [simulationResult, setSimulationResult] = useState(null);

  // Fraud / Anomaly Detection Flagged Transactions (Currently no dedicated backend API)
  const [flaggedTransactions, setFlaggedTransactions] = useState([]);

  // Payments at risk of SLA breach
  const [paymentDelays, setPaymentDelays] = useState([]);

  // Resource optimization suggestions (Currently no dedicated backend API)
  const [resourceSuggestions, setResourceSuggestions] = useState([]);

  useEffect(() => {
    if (officer?.username) {
      officerApi.getOverduePayments()
        .then(data => setPaymentDelays(data || []))
        .catch(err => console.error("Failed to fetch overdue payments:", err));
    }
  }, [officer?.username]);

  useEffect(() => {
    if (officer) {
      localStorage.setItem('kisanflow_officer', JSON.stringify(officer));
    }
  }, [officer]);

  const acceptAlert = (alertId) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, status: 'accepted' } : a))
    );
  };

  const dismissAlert = (alertId) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, status: 'dismissed' } : a))
    );
  };

  const applyResourceSuggestion = (suggestionId) => {
    setResourceSuggestions((prev) =>
      prev.map((s) => (s.id === suggestionId ? { ...s, status: 'applied' } : s))
    );
  };

  return (
    <OfficerContext.Provider
      value={{
        officer,
        setOfficer,
        centres,
        setCentres,
        centresLoading,
        centresError,
        selectedCentreId,
        setSelectedCentreId,
        alerts,
        setAlerts,
        alertsLoading,
        alertsError,
        stageHealthData,
        simulationResult,
        setSimulationResult,
        flaggedTransactions,
        paymentDelays,
        resourceSuggestions,
        wsConnected,
        liveCentreQueues,
        liveOccupancy,
        recentEntryExit,
        acceptAlert,
        dismissAlert,
        applyResourceSuggestion,
      }}
    >
      {children}
    </OfficerContext.Provider>
  );
};

export const useOfficer = () => useContext(OfficerContext);
