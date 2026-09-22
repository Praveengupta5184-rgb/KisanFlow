import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

// The JWT is sent in STOMP CONNECT headers. Configure Spring's handshake/security
// interceptor to validate it when auth is enforced on the WebSocket endpoint.
export function connectQueueSocket({ apiBaseUrl, token, centreId, farmerId, onQueue, onToken, onNotification }) {
  const client = new Client({
    webSocketFactory: () => new SockJS(`${apiBaseUrl}/ws/queue`),
    connectHeaders: { Authorization: `Bearer ${token}` },
    reconnectDelay: 1000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    debug: () => {},
  });
  client.onConnect = () => {
    client.subscribe(`/topic/centre/${centreId}/queue`, message => onQueue(JSON.parse(message.body)));
    client.subscribe(`/topic/farmer/${farmerId}/status`, message => onToken(JSON.parse(message.body)));
    client.subscribe(`/topic/farmer/${farmerId}/notification`, message => onNotification(JSON.parse(message.body)));
    client.publish({ destination: '/app/queue/refresh', body: JSON.stringify({ centreId }) });
  };
  client.activate();
  return () => client.deactivate();
}
