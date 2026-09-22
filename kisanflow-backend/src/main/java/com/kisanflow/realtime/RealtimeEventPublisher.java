package com.kisanflow.realtime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Central utility for publishing standardized real-time events over STOMP.
 * Follows the schema: event (name), payload (data), timestamp.
 */
@Component
@RequiredArgsConstructor
public class RealtimeEventPublisher {

    private final SimpMessagingTemplate messaging;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class StandardEvent<T> {
        private String event;
        private T payload;
        private OffsetDateTime timestamp;
    }

    public <T> void publishCentreEvent(UUID centreId, String topicSuffix, String eventName, T payload) {
        StandardEvent<T> event = StandardEvent.<T>builder()
                .event(eventName)
                .payload(payload)
                .timestamp(OffsetDateTime.now())
                .build();
        messaging.convertAndSend("/topic/centre/" + centreId + topicSuffix, event);
    }

    public <T> void publishFarmerEvent(UUID farmerId, String topicSuffix, String eventName, T payload) {
        StandardEvent<T> event = StandardEvent.<T>builder()
                .event(eventName)
                .payload(payload)
                .timestamp(OffsetDateTime.now())
                .build();
        messaging.convertAndSend("/topic/farmer/" + farmerId + topicSuffix, event);
    }

    public <T> void publishCustomTopic(String destination, String eventName, T payload) {
        StandardEvent<T> event = StandardEvent.<T>builder()
                .event(eventName)
                .payload(payload)
                .timestamp(OffsetDateTime.now())
                .build();
        messaging.convertAndSend(destination, event);
    }
}
