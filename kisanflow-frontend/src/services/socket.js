/**
 * KisanFlow WebSocket Service — STOMP over SockJS
 *
 * Backend STOMP endpoint: /ws/queue (with SockJS fallback)
 * Topics:
 *   /topic/centre/{centreId}/queue  → QueueState updates
 *   /topic/farmer/{farmerId}/status → personal booking status
 *   /topic/farmer/{farmerId}/notification → turn-approaching alerts
 */
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

let WS_URL =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_WS_URL) ||
  '/ws/queue';

// SockJS requires HTTP/HTTPS URLs, not ws:// or wss://
if (WS_URL.startsWith('wss://')) {
  WS_URL = WS_URL.replace('wss://', 'https://');
} else if (WS_URL.startsWith('ws://')) {
  WS_URL = WS_URL.replace('ws://', 'http://');
}

class SocketService {
  constructor() {
    this.client = null;
    this.listeners = new Map();
    this.isConnected = false;
    this.subscriptions = new Map(); // topic → STOMP subscription handle
    this.topicCallbacks = new Map();
    this._reconnectDelay = 5000;
  }

  connect() {
    if (this.client) return;

    this.client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      reconnectDelay: this._reconnectDelay,

      onConnect: () => {
        this.isConnected = true;
        this.emit('connection_status', { connected: true });
        this.topicCallbacks.forEach((callback, topic) => this._doSubscribe(topic, callback));
      },

      onDisconnect: () => {
        this.isConnected = false;
        this.emit('connection_status', { connected: false });
      },

      onStompError: (frame) => {
        console.error('STOMP error:', frame.headers?.message);
        this.isConnected = false;
        this.emit('connection_status', { connected: false });
      },
      
      onWebSocketClose: () => {
        this.isConnected = false;
        this.emit('connection_status', { connected: false });
      }
    });

    this.client.activate();
  }

  /**
   * Subscribe to a STOMP topic.
   * Returns an unsubscribe function.
   */
  subscribeTopic(topic, callback) {
    this.topicCallbacks.set(topic, callback);
    if (this.client && this.client.connected) {
      return this._doSubscribe(topic, callback);
    }
    return () => {
      this.topicCallbacks.delete(topic);
      if (this.subscriptions.has(topic)) {
        try { this.subscriptions.get(topic).unsubscribe(); } catch {}
        this.subscriptions.delete(topic);
      }
    };
  }

  _doSubscribe(topic, callback) {
    if (!this.client || !this.client.connected) return () => {};
    // Unsubscribe existing subscription to this topic first
    if (this.subscriptions.has(topic)) {
      try { this.subscriptions.get(topic).unsubscribe(); } catch {}
    }
    const sub = this.client.subscribe(topic, (message) => {
      try {
        const data = JSON.parse(message.body);
        if (data && data.payload !== undefined) {
          callback(data.payload, data.event);
        } else {
          callback(data);
        }
      } catch { /* ignore malformed */ }
    });
    this.subscriptions.set(topic, sub);
    return () => {
      try { sub.unsubscribe(); } catch {}
      this.subscriptions.delete(topic);
      if (this.topicCallbacks.get(topic) === callback) this.topicCallbacks.delete(topic);
    };
  }

  /** Generic event bus for internal app events (e.g. connection_status) */
  on(event, callback) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event).push(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (!this.listeners.has(event)) return;
    this.listeners.set(event, this.listeners.get(event).filter(cb => cb !== callback));
  }

  emit(event, payload) {
    if (!this.listeners.has(event)) return;
    this.listeners.get(event).forEach(cb => {
      try { cb(payload); } catch (e) { console.error('Socket listener error:', e); }
    });
  }

  disconnect() {
    if (this.client) {
      this.client.deactivate();
      this.client = null;
    }
    this.isConnected = false;
    this.subscriptions.clear();
    this.topicCallbacks.clear();
  }
}

export const socketService = new SocketService();

/**
 * React hook: subscribe to a centre's queue updates.
 * Returns the latest QueueState (or null).
 *
 * Usage:
 *   const queueState = useCentreQueue(centreId);
 */
export function buildCentreQueueTopic(centreId) {
  return `/topic/centre/${centreId}/queue`;
}

export function buildFarmerStatusTopic(farmerId) {
  return `/topic/farmer/${farmerId}/status`;
}

export function buildFarmerQueueTopic(farmerId) {
  return `/topic/farmer/${farmerId}/queue`;
}

export function buildFarmerNotificationTopic(farmerId) {
  return `/topic/farmer/${farmerId}/notification`;
}

export function buildCentrePricesTopic(centreId) {
  return `/topic/centre/${centreId}/prices`;
}

export function buildCentreOccupancyTopic(centreId) {
  return `/topic/centre/${centreId}/occupancy`;
}

export function buildCentreEntryExitTopic(centreId) {
  return `/topic/centre/${centreId}/entry-exit`;
}

export function buildFarmerMandiStatusTopic(farmerId) {
  return `/topic/farmer/${farmerId}/mandi-status`;
}

/** Fired when an officer creates a lot for the farmer's booking */
export function buildFarmerLotTopic(farmerId) {
  return `/topic/farmer/${farmerId}/lot`;
}

/** Fired on BID_UPDATED and AUCTION_CLOSED for this farmer's lot */
export function buildFarmerAuctionsTopic(farmerId) {
  return `/topic/farmer/${farmerId}/auctions`;
}

/** Fired when an officer records a payment against the farmer's booking */
export function buildFarmerPaymentTopic(farmerId) {
  return `/topic/farmer/${farmerId}/payment`;
}
