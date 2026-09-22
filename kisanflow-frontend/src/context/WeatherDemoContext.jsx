/**
 * WeatherDemoContext — KisanFlow Manual Weather Simulation
 *
 * ⚠️  DEMO / SIMULATED WEATHER — NOT REAL WEATHER DATA
 *
 * CRITICAL RULES:
 *  - rainActive ALWAYS initializes to false. Never auto-starts.
 *  - Rain only becomes true when officer manually clicks START HEAVY RAIN.
 *  - Page refresh always resets rain to OFF.
 *  - This context is isolated — it does NOT touch real bookings or API data.
 */
import React, { createContext, useContext, useState, useCallback } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// DEMO DATASET (static, never auto-executes)
// ─────────────────────────────────────────────────────────────────────────────

export const DEMO_FARMER = {
  name: 'Ramesh Kumar',
  token: 'T105',
  tokenNumber: '105',
  mandi: 'Kisan Procurement Centre A',
  date: 'Today',
  time: '4:00 PM',
  status: 'CONFIRMED',
};

export const DEMO_QUEUE = [
  { token: 'T101', time: '3:00 PM', isDemo: false },
  { token: 'T102', time: '3:10 PM', isDemo: false },
  { token: 'T103', time: '3:20 PM', isDemo: false },
  { token: 'T104', time: '3:30 PM', isDemo: false },
  { token: 'T105', time: '4:00 PM', isDemo: true },
  { token: 'T106', time: '4:10 PM', isDemo: false },
  { token: 'T107', time: '4:20 PM', isDemo: false },
];

// Emergency slots checked in order — first SAFE one is auto-selected on reschedule
export const EMERGENCY_SLOTS = [
  {
    id: 'es-1',
    label: 'Today – 4:00 PM',
    date: 'Today',
    time: '4:00 PM',
    weather: 'HEAVY_RAIN',
    safe: false,
    emergencyCapacity: 10,
    used: 10,
    status: 'UNSAFE',
  },
  {
    id: 'es-2',
    label: 'Today – 4:30 PM',
    date: 'Today',
    time: '4:30 PM',
    weather: 'HEAVY_RAIN',
    safe: false,
    emergencyCapacity: 10,
    used: 10,
    status: 'UNSAFE',
  },
  {
    id: 'es-3',
    label: 'Tomorrow – 10:00 AM',
    date: 'Tomorrow',
    time: '10:00 AM',
    weather: 'SAFE',
    safe: true,
    emergencyCapacity: 10,
    used: 0,
    status: 'AVAILABLE',
  },
  {
    id: 'es-4',
    label: 'Tomorrow – 10:30 AM',
    date: 'Tomorrow',
    time: '10:30 AM',
    weather: 'SAFE',
    safe: true,
    emergencyCapacity: 10,
    used: 0,
    status: 'AVAILABLE',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Initial State — RAIN IS ALWAYS OFF ON LOAD
// ─────────────────────────────────────────────────────────────────────────────
const INITIAL_STATE = {
  rainActive: false,          // ← NEVER true on startup/refresh
  decision: null,             // null | 'RESCHEDULED' | 'KEPT' | 'CANCELLED'
  newSlot: null,              // populated only after RESCHEDULE
  emergencySlots: EMERGENCY_SLOTS.map(s => ({ ...s })), // deep copy
  affectedCount: 0,
  rescheduledCount: 0,
  keptCount: 0,
  cancelledCount: 0,
  events: [],                 // log of demo events for officer view
};

// ─────────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────────
const WeatherDemoContext = createContext(null);

export const WeatherDemoProvider = ({ children }) => {
  // Rain ALWAYS starts as false — no localStorage read for rainActive
  const [state, setState] = useState(INITIAL_STATE);
  const channelRef = React.useRef(null);

  // Setup BroadcastChannel for cross-tab synchronization
  React.useEffect(() => {
    const channel = new BroadcastChannel('weather_demo_sync');
    channelRef.current = channel;

    channel.onmessage = (event) => {
      const { type, payload } = event.data;
      if (type === 'SYNC_STATE') {
        setState(payload);
      } else if (type === 'REQUEST_STATE') {
        // If another tab just opened and asked for state, and we have active data, send it
        setState(prev => {
          if (prev.rainActive || prev.decision) {
            channel.postMessage({ type: 'SYNC_STATE', payload: prev });
          }
          return prev;
        });
      }
    };

    // Ask other open tabs for the current state (if any)
    channel.postMessage({ type: 'REQUEST_STATE' });

    return () => {
      channel.close();
    };
  }, []);

  const broadcastState = (newState) => {
    if (channelRef.current) {
      channelRef.current.postMessage({ type: 'SYNC_STATE', payload: newState });
    }
  };

  /**
   * Officer action: manually start the rain simulation.
   * This is the ONLY way rainActive becomes true.
   */
  const startRain = useCallback(() => {
    setState(prev => {
      const newState = {
        ...prev,
        rainActive: true,
        decision: null,
        newSlot: null,
        affectedCount: 1,
        rescheduledCount: 0,
        keptCount: 0,
        cancelledCount: 0,
        emergencySlots: EMERGENCY_SLOTS.map(s => ({ ...s })),
        events: [
          {
            id: `evt-${Date.now()}`,
            type: 'RAIN_STARTED',
            message: '🌧️ Heavy Rain simulation started by Officer',
            time: new Date().toLocaleTimeString(),
          },
          {
            id: `evt-${Date.now() + 1}`,
            type: 'FARMER_AFFECTED',
            message: `⚠️ Farmer ${DEMO_FARMER.name} (${DEMO_FARMER.token}) affected at ${DEMO_FARMER.time}`,
            time: new Date().toLocaleTimeString(),
          },
        ],
      };
      broadcastState(newState);
      return newState;
    });
  }, []);

  /**
   * Farmer action: reschedule to the next safe emergency slot.
   * Automatically finds the first SAFE & AVAILABLE slot. No form needed.
   */
  const reschedule = useCallback(() => {
    setState(prev => {
      if (!prev.rainActive || prev.decision) return prev;

      // Find first safe slot with capacity available
      const safeSlot = prev.emergencySlots.find(s => s.safe && s.used < s.emergencyCapacity);
      if (!safeSlot) return prev;

      // Book one emergency seat in that slot
      const updatedSlots = prev.emergencySlots.map(s =>
        s.id === safeSlot.id ? { ...s, used: s.used + 1 } : s
      );

      const newState = {
        ...prev,
        decision: 'RESCHEDULED',
        newSlot: safeSlot,
        rescheduledCount: 1,
        emergencySlots: updatedSlots,
        events: [
          ...prev.events,
          {
            id: `evt-${Date.now()}`,
            type: 'RESCHEDULED',
            message: `✅ ${DEMO_FARMER.token} auto-rescheduled → ${safeSlot.date} ${safeSlot.time} (Emergency Slot)`,
            time: new Date().toLocaleTimeString(),
          },
        ],
      };
      broadcastState(newState);
      return newState;
    });
  }, []);

  /**
   * Farmer action: keep the original token / appointment unchanged.
   */
  const keepToken = useCallback(() => {
    setState(prev => {
      if (!prev.rainActive || prev.decision) return prev;
      const newState = {
        ...prev,
        decision: 'KEPT',
        keptCount: 1,
        events: [
          ...prev.events,
          {
            id: `evt-${Date.now()}`,
            type: 'KEPT',
            message: `🎟️ ${DEMO_FARMER.token} retained original appointment — ${DEMO_FARMER.date} ${DEMO_FARMER.time}`,
            time: new Date().toLocaleTimeString(),
          },
        ],
      };
      broadcastState(newState);
      return newState;
    });
  }, []);

  /**
   * Farmer action: cancel the token.
   */
  const cancelToken = useCallback(() => {
    setState(prev => {
      if (!prev.rainActive || prev.decision) return prev;
      const newState = {
        ...prev,
        decision: 'CANCELLED',
        cancelledCount: 1,
        events: [
          ...prev.events,
          {
            id: `evt-${Date.now()}`,
            type: 'CANCELLED',
            message: `❌ ${DEMO_FARMER.token} cancelled by farmer due to weather`,
            time: new Date().toLocaleTimeString(),
          },
        ],
      };
      broadcastState(newState);
      return newState;
    });
  }, []);

  /**
   * Officer action: reset demo to clean initial state.
   * Rain goes back to OFF. All decisions cleared.
   */
  const resetDemo = useCallback(() => {
    const newState = {
      ...INITIAL_STATE,
      emergencySlots: EMERGENCY_SLOTS.map(s => ({ ...s })),
    };
    setState(newState);
    broadcastState(newState);
  }, []);

  const value = {
    // State
    rainActive: state.rainActive,
    decision: state.decision,
    newSlot: state.newSlot,
    emergencySlots: state.emergencySlots,
    affectedCount: state.affectedCount,
    rescheduledCount: state.rescheduledCount,
    keptCount: state.keptCount,
    cancelledCount: state.cancelledCount,
    events: state.events,

    // Static demo data
    demoFarmer: DEMO_FARMER,
    demoQueue: DEMO_QUEUE,

    // Actions (officer)
    startRain,
    resetDemo,

    // Actions (farmer)
    reschedule,
    keepToken,
    cancelToken,
  };

  return (
    <WeatherDemoContext.Provider value={value}>
      {children}
    </WeatherDemoContext.Provider>
  );
};

export const useWeatherDemo = () => {
  const ctx = useContext(WeatherDemoContext);
  if (!ctx) throw new Error('useWeatherDemo must be used inside WeatherDemoProvider');
  return ctx;
};
