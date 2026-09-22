package com.kisanflow.service;

import lombok.Data;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class IvrSessionService {

    private final Map<String, IvrSession> sessions = new ConcurrentHashMap<>();

    @Data
    public static class IvrSession {
        private String callerId;
        private String currentState;
        private Instant lastUpdated;
        private Map<String, Object> context = new ConcurrentHashMap<>();

        public IvrSession(String callerId) {
            this.callerId = callerId;
            this.currentState = "MAIN_MENU";
            this.lastUpdated = Instant.now();
        }
    }

    public IvrSession getOrCreateSession(String callerId) {
        return sessions.compute(callerId, (key, session) -> {
            if (session == null || session.getLastUpdated().isBefore(Instant.now().minusSeconds(300))) {
                return new IvrSession(callerId);
            }
            session.setLastUpdated(Instant.now());
            return session;
        });
    }

    public void updateState(String callerId, String newState) {
        IvrSession session = getOrCreateSession(callerId);
        session.setCurrentState(newState);
        session.setLastUpdated(Instant.now());
    }

    public void endSession(String callerId) {
        sessions.remove(callerId);
    }
}
