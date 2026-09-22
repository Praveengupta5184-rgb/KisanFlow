package com.kisanflow.notification;

import com.kisanflow.entity.KisanFlowEntities.*; import com.kisanflow.repository.KisanFlowRepositories.*; import com.kisanflow.service.KisanFlowServices.BookingStateChanged;
import lombok.*; import lombok.extern.slf4j.Slf4j; import org.springframework.context.event.EventListener; import org.springframework.stereotype.*; import org.springframework.web.bind.annotation.*; import java.time.*; import java.util.*;
import org.springframework.beans.factory.annotation.Value;

public final class NotificationModule {
    private NotificationModule(){}
    
    public enum Channel { APP, SMS, IN_APP }
    public enum DeliveryResult { SENT, SIMULATED, FAILED }
    
    @Data @NoArgsConstructor @AllArgsConstructor @Builder 
    public static class NotificationCommand {
        private UUID farmerId;
        private Channel channel;
        private String message;
        private String eventType;
    }
    
    // Application Events
    public record GateEvent(UUID farmerId, UUID centreId, String eventType, String message) {}
    public record LotEvent(UUID farmerId, UUID centreId, String message) {}
    public record ProcurementEvent(UUID farmerId, UUID centreId, String message) {}
    
    public interface NotificationSender {
        Channel channel(); 
        DeliveryResult send(NotificationCommand command);
    }
    
    @Component @Slf4j 
    public static class MockSmsSender implements NotificationSender {
        @Value("${kisanflow.notifications.simulation-mode:true}") private boolean simulationMode;
        public Channel channel() { return Channel.SMS; }
        public DeliveryResult send(NotificationCommand c) {
            if (simulationMode) {
                log.info("MOCK SMS SIMULATED to farmer {}: {}", c.getFarmerId(), c.getMessage());
                return DeliveryResult.SIMULATED;
            }
            log.error("MOCK SMS FAILED to farmer {}: Real provider not configured and simulation disabled", c.getFarmerId());
            return DeliveryResult.FAILED;
        }
    }
    
    @Component @Slf4j 
    public static class MockAppSender implements NotificationSender {
        @Value("${kisanflow.notifications.simulation-mode:true}") private boolean simulationMode;
        public Channel channel() { return Channel.APP; }
        public DeliveryResult send(NotificationCommand c) {
            if (simulationMode) {
                log.info("MOCK FCM PUSH SIMULATED to farmer {}: {}", c.getFarmerId(), c.getMessage());
                return DeliveryResult.SIMULATED;
            }
            log.error("MOCK FCM PUSH FAILED to farmer {}: Real provider not configured and simulation disabled", c.getFarmerId());
            return DeliveryResult.FAILED;
        }
    }
    
    @Component @Slf4j 
    public static class InAppSender implements NotificationSender {
        public Channel channel() { return Channel.IN_APP; }
        public DeliveryResult send(NotificationCommand c) {
            log.info("In-app notice to farmer {}: {}", c.getFarmerId(), c.getMessage());
            return DeliveryResult.SENT;
        }
    }
    
    @Service @RequiredArgsConstructor @Slf4j 
    public static class NotificationService {
        private final List<NotificationSender> senders;
        private final NotificationRepository records;
        private final FarmerRepository farmers;
        
        public void send(NotificationCommand c) {
            try {
                DeliveryResult result = senders.stream()
                    .filter(s -> s.channel() == c.getChannel())
                    .findFirst()
                    .orElseThrow(() -> new IllegalStateException("No provider for channel " + c.getChannel()))
                    .send(c);
                    
                Farmer f = farmers.findById(c.getFarmerId()).orElseThrow();
                String dbChannel = c.getChannel() == Channel.IN_APP ? "app" : c.getChannel().name().toLowerCase();
                String statusString = result.name().toLowerCase();
                if (statusString.equals("simulated")) {
                    statusString = "sent";
                }
                records.save(Notification.builder()
                    .farmer(f)
                    .channel(dbChannel)
                    .message(c.getMessage())
                    .sentAt(OffsetDateTime.now())
                    .status(statusString)
                    .build());
            } catch (Exception e) {
                log.error("Notification delivery failed for farmer {} event {}", c.getFarmerId(), c.getEventType(), e);
            }
        }
        
        @EventListener 
        public void bookingUpdate(BookingStateChanged e) {
            if (e.status() != null && Set.of("token_generated", "quality_check", "payment_processing").contains(e.status())) {
                send(NotificationCommand.builder().farmerId(e.farmerId()).channel(Channel.SMS).eventType("bookingStatus").message("KisanFlow: your token status is now " + e.status().replace("_", " ") + ".").build());
            }
        }
        
        @EventListener 
        public void onGateEvent(GateEvent e) {
            send(NotificationCommand.builder().farmerId(e.farmerId()).channel(Channel.SMS).eventType("gateEvent").message("KisanFlow: " + e.message()).build());
        }
        
        @EventListener 
        public void onLotEvent(LotEvent e) {
            send(NotificationCommand.builder().farmerId(e.farmerId()).channel(Channel.SMS).eventType("lotCreated").message("KisanFlow: " + e.message()).build());
        }
        
        @EventListener 
        public void onProcurementEvent(ProcurementEvent e) {
            send(NotificationCommand.builder().farmerId(e.farmerId()).channel(Channel.SMS).eventType("procurementUpdated").message("KisanFlow: " + e.message()).build());
        }
    }
    
    @RestController @RequestMapping("/api/v1/telephony") @CrossOrigin(origins="*") @RequiredArgsConstructor 
    public static class MissedCallController {
        private final FarmerRepository farmers;
        private final BookingRepository bookings;
        private final NotificationService notifications;
        
        @PostMapping("/missed-call") 
        public Map<String,String> missed(@RequestBody Map<String,String> body) {
            Farmer farmer = farmers.findByMobileNumber(body.get("mobileNumber")).orElseThrow(() -> new NoSuchElementException("Farmer not found"));
            var b = bookings.findByFarmerIdAndStatusIn(farmer.getId(), List.of("token_generated", "arrived", "weighing", "quality_check", "procurement", "payment_processing")).stream().findFirst();
            String message = b.map(x -> "Token A" + (100 + x.getTokenNumber()) + ", status: " + x.getStatus().replace("_", " ")).orElse("No active token.");
            notifications.send(NotificationCommand.builder().farmerId(farmer.getId()).channel(Channel.SMS).eventType("missedCall").message(message).build());
            return Map.of("status", "accepted", "message", message);
        }
    }
}
