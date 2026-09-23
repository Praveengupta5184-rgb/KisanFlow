package com.kisanflow.digitaltwin;

import com.kisanflow.demo.InMemoryDemoStore;
import com.kisanflow.entity.KisanFlowEntities.*;
import com.kisanflow.integration.FastApiIntegrationClient;
import com.kisanflow.service.KisanFlowServices.BookingStateChanged;
import lombok.*; 
import lombok.extern.slf4j.Slf4j; 
import org.springframework.context.event.EventListener; 
import org.springframework.scheduling.annotation.Scheduled; 
import org.springframework.stereotype.*; 
import org.springframework.web.bind.annotation.*; 

import java.math.*; 
import java.time.*; 
import java.util.*; 
import java.util.concurrent.*;

public final class DigitalTwinModule {
    private DigitalTwinModule(){}
    
    @Data @NoArgsConstructor @AllArgsConstructor @Builder 
    public static class FarmerTwin {
        private UUID farmerId,bookingId,centreId;
        private String currentStatus;
        private OffsetDateTime expectedCompletionTime;
        private boolean possibleDelayFlag;
        private double predictedWaitMinutes;
        private OffsetDateTime updatedAt;
    }
    
    @Data @NoArgsConstructor @AllArgsConstructor @Builder 
    public static class CentreTwin {
        private UUID centreId;
        private BigDecimal processingSpeed,avgQueue,staffEfficiency;
        private String peakHours,bottleneckStage;
        private int capacity,staffCount;
        private boolean paymentDelayRisk;
        private OffsetDateTime updatedAt;
    }
    
    @Service @RequiredArgsConstructor @Slf4j 
    public static class TwinService {
        private final InMemoryDemoStore store;
        private final FastApiIntegrationClient ai;
        private final Map<UUID,FarmerTwin> farmers = new ConcurrentHashMap<>();
        private final Map<UUID,CentreTwin> centreCache = new ConcurrentHashMap<>();
        
        public FarmerTwin farmer(UUID id){return farmers.computeIfAbsent(id,this::computeFarmer);} 
        public CentreTwin centre(UUID id){return centreCache.computeIfAbsent(id,this::computeCentre);}
        
        @EventListener 
        public void bookingChanged(BookingStateChanged event){
            FarmerTwin f = computeFarmer(event.farmerId());
            CentreTwin c = computeCentre(event.centreId());
            farmers.put(event.farmerId(), f);
            centreCache.put(event.centreId(), c);
        }
        
        @Scheduled(fixedDelayString="${app.digital-twin.refresh-ms:300000}") 
        public void refresh(){
            store.getAllCentres().forEach(c -> {
                CentreTwin t = computeCentre(c.getId());
                centreCache.put(c.getId(), t);
            });
        }
        
        private FarmerTwin computeFarmer(UUID farmerId) {
            List<String> activeStates = List.of("token_generated","arrived","weighing","quality_check","procurement","payment_processing");
            Booking b = store.getAllBookings().stream()
                .filter(x -> x.getFarmer().getId().equals(farmerId) && activeStates.contains(x.getStatus()))
                .findFirst().orElse(null);
                
            if (b == null) return FarmerTwin.builder().farmerId(farmerId).currentStatus("no_active_booking").updatedAt(OffsetDateTime.now()).build();
            double wait = Math.max(0, b.getTokenNumber() - 1) * 6;
            ai.waitTime(Map.of("centreId",b.getCentre().getId().toString(),"arrivalTime",OffsetDateTime.now().toString(),"currentLoad",b.getCentre().getCurrentLoad(),"snapshots",List.of())).subscribe(x->log.debug("AI wait estimate received for {}",farmerId));
            return FarmerTwin.builder().farmerId(farmerId).bookingId(b.getId()).centreId(b.getCentre().getId()).currentStatus(b.getStatus()).predictedWaitMinutes(wait).expectedCompletionTime(OffsetDateTime.now().plusMinutes((long)wait)).possibleDelayFlag(wait>60).updatedAt(OffsetDateTime.now()).build();
        }
        
        private CentreTwin computeCentre(UUID id) {
            ProcurementCentre c = store.getCentreById(id);
            return CentreTwin.builder()
                .centreId(id)
                .processingSpeed(c.getProcessingSpeed())
                .capacity(c.getCapacity())
                .staffCount(c.getStaffCount())
                .avgQueue(BigDecimal.ZERO)
                .peakHours("[]")
                .staffEfficiency(null)
                .bottleneckStage("unknown")
                .paymentDelayRisk(false)
                .updatedAt(OffsetDateTime.now())
                .build();
        } 
    }
    
    @RestController @RequestMapping("/api/v1/digital-twin") @CrossOrigin(origins="*") @RequiredArgsConstructor 
    public static class TwinController {
        private final TwinService twins;
        
        @GetMapping("/farmer/{farmerId}") 
        public FarmerTwin farmer(@PathVariable UUID farmerId){
            return twins.farmer(farmerId);
        }
        
        @GetMapping("/centre/{centreId}") 
        public CentreTwin centre(@PathVariable UUID centreId){
            return twins.centre(centreId);
        }
    }
}
