package com.kisanflow.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.*;

/** STOMP/SockJS endpoint: /ws/queue. Client messages use /app; broadcasts use /topic. */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {
 @Override public void configureMessageBroker(MessageBrokerRegistry registry){registry.enableSimpleBroker("/topic");registry.setApplicationDestinationPrefixes("/app");}
 @Override public void registerStompEndpoints(StompEndpointRegistry registry){registry.addEndpoint("/ws/queue").setAllowedOriginPatterns("*").withSockJS();}
}
