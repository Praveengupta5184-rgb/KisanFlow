import React, { createContext, useContext, useState, useEffect } from 'react';
import { traderApi } from '../services/api';
import { socketService } from '../services/socket';

const TraderContext = createContext();

export const TraderProvider = ({ children }) => {
  const [trader, setTrader] = useState(() => {
    const saved = localStorage.getItem('kisanflow_trader');
    return saved ? JSON.parse(saved) : null;
  });

  const [activeLots, setActiveLots] = useState([]);
  const [loadingLots, setLoadingLots] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);

  useEffect(() => {
    if (trader) {
      localStorage.setItem('kisanflow_trader', JSON.stringify(trader));
    } else {
      localStorage.removeItem('kisanflow_trader');
    }
  }, [trader]);

  useEffect(() => {
    if (!trader?.centreId) return;

    const fetchLots = async () => {
      setLoadingLots(true);
      try {
        const lots = await traderApi.getActiveLots(trader.centreId);
        setActiveLots(lots || []);
      } catch (err) {
        console.error("Failed to fetch active lots", err);
      } finally {
        setLoadingLots(false);
      }
    };
    fetchLots();

    socketService.connect();
    const unsubConn = socketService.on('connection_status', ({ connected }) => setWsConnected(connected));
    
    // Subscribe to new lot creations and closures for this centre
    const unsubAuctions = socketService.subscribeTopic(`/topic/centre/${trader.centreId}/auctions`, (lotData) => {
      setActiveLots(prev => {
        if (lotData.status === 'closed') {
          return prev.filter(l => l.id !== lotData.id);
        }
        const existing = prev.find(l => l.id === lotData.id);
        if (existing) {
          return prev.map(l => l.id === lotData.id ? { ...existing, ...lotData } : l);
        }
        return [lotData, ...prev];
      });
    });

    return () => {
      unsubConn();
      unsubAuctions();
    };
  }, [trader?.centreId, wsConnected]);

  // Dynamically subscribe to bid updates for all active lots
  useEffect(() => {
    if (!trader?.centreId || activeLots.length === 0) return;
    
    const unsubs = activeLots.map(lot => 
      socketService.subscribeTopic(`/topic/centre/${trader.centreId}/bids/${lot.id}`, (bidData) => {
        setActiveLots(prev => prev.map(l => {
          if (l.id === lot.id) {
            return {
              ...l,
              highestBidAmount: bidData.amount,
              highestBidderId: bidData.traderId
            };
          }
          return l;
        }));
      })
    );

    return () => {
      unsubs.forEach(unsub => unsub());
    };
  }, [activeLots.map(l => l.id).join(','), trader?.centreId]);

  const logout = () => {
    setTrader(null);
    localStorage.removeItem('token');
  };

  return (
    <TraderContext.Provider
      value={{
        trader,
        setTrader,
        activeLots,
        setActiveLots,
        loadingLots,
        wsConnected,
        logout
      }}
    >
      {children}
    </TraderContext.Provider>
  );
};

export const useTrader = () => useContext(TraderContext);
