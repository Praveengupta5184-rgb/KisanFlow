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
  const [payments, setPayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
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

    const fetchPayments = async () => {
      if (!trader?.traderId) return;
      setLoadingPayments(true);
      try {
        const pays = await traderApi.getTraderPayments(trader.traderId);
        setPayments(pays || []);
      } catch (err) {
        console.error("Failed to fetch payments", err);
      } finally {
        setLoadingPayments(false);
      }
    };
    fetchPayments();

    socketService.connect();
    const unsubConn = socketService.on('connection_status', ({ connected }) => setWsConnected(connected));
    
    // Subscribe to new lot creations, bid updates, and closures for this centre
    const unsubAuctions = socketService.subscribeTopic(`/topic/centre/${trader.centreId}/auctions`, (lotData, event) => {
      setActiveLots(prev => {
        // Only remove from active board when farmer finalizes (BID_ACCEPTED)
        if (lotData.status === 'BID_ACCEPTED') {
          // Keep it visible so winning trader can see "You Won" and losing traders see "Closed"
          // Update in place with final status
          const existing = prev.find(l => l.id === lotData.id);
          if (existing) {
            return prev.map(l => l.id === lotData.id ? { ...existing, ...lotData } : l);
          }
          return prev;
        }
        // For all other events (LOT_CREATED, AUCTION_CLOSED, BID_UPDATED): update in place
        const existing = prev.find(l => l.id === lotData.id);
        if (existing) {
          return prev.map(l => l.id === lotData.id ? { ...existing, ...lotData } : l);
        }
        // New lot
        return [lotData, ...prev];
      });
    });

    const unsubPayments = socketService.subscribeTopic(`/topic/trader/${trader.traderId}/payment`, (paymentData) => {
      setPayments(prev => {
        const existing = prev.find(p => p.id === paymentData.id);
        if (existing) {
          return prev.map(p => p.id === paymentData.id ? { ...existing, ...paymentData } : p);
        }
        return [paymentData, ...prev];
      });
    });

    return () => {
      unsubConn();
      unsubAuctions();
      unsubPayments();
    };
  }, [trader?.centreId, trader?.traderId, wsConnected]);

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
        payments,
        setPayments,
        loadingPayments,
        wsConnected,
        logout
      }}
    >
      {children}
    </TraderContext.Provider>
  );
};

export const useTrader = () => useContext(TraderContext);
