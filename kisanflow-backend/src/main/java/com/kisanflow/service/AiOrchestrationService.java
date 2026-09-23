package com.kisanflow.service;

import com.kisanflow.demo.InMemoryDemoStore;
import com.kisanflow.entity.KisanFlowEntities.Booking;
import com.kisanflow.entity.KisanFlowEntities.Farmer;
import com.kisanflow.entity.KisanFlowEntities.ProcurementCentre;
import com.kisanflow.integration.FastApiIntegrationClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiOrchestrationService {
    private final FastApiIntegrationClient aiClient;
    private final InMemoryDemoStore store;
    private final KisanFlowServices.BookingService bookingService;

    public Map<String, Object> recommendCentres(UUID farmerId, double lat, double lon) {
        Farmer farmer = store.getFarmerById(farmerId);
        if (farmer == null) throw new IllegalArgumentException("Farmer not found");
        List<ProcurementCentre> allCentres = store.getAllCentres();
        
        List<Map<String, Object>> centreInputs = allCentres.stream().map(c -> {
            Map<String, Object> input = new HashMap<>();
            input.put("centreId", c.getId().toString());
            // rough distance heuristic for demo
            double dist = Math.sqrt(Math.pow(c.getLatitude().doubleValue() - lat, 2) + Math.pow(c.getLongitude().doubleValue() - lon, 2)) * 111.0; 
            input.put("distanceKm", dist);
            long q = store.getAllBookings().stream().filter(b -> b.getCentre().getId().equals(c.getId()) && b.getBookingDate().equals(LocalDate.now()) && KisanFlowServices.ACTIVE.contains(b.getStatus())).count();
            input.put("currentQueue", q);
            input.put("currentLoad", c.getCurrentLoad() == null ? 0 : c.getCurrentLoad());
            input.put("processingSpeed", c.getProcessingSpeed() == null ? 1.0 : c.getProcessingSpeed().doubleValue());
            input.put("capacity", c.getCapacity() == null ? 100 : c.getCapacity());
            return input;
        }).toList();

        Map<String, Object> request = new HashMap<>();
        request.put("farmerLatitude", lat);
        request.put("farmerLongitude", lon);
        request.put("centres", centreInputs);

        return aiClient.bestCentre(request).block();
    }

    public Map<String, Object> chat(UUID farmerId, String query, String language) {
        Farmer farmer = store.getFarmerById(farmerId);
        if (farmer == null) throw new IllegalArgumentException("Farmer not found");
        List<Booking> activeBookings = store.getAllBookings().stream().filter(b -> b.getFarmer().getId().equals(farmerId) && KisanFlowServices.ACTIVE.contains(b.getStatus())).toList();
        
        Map<String, Object> context = new HashMap<>();
        context.put("farmerName", farmer.getName());
        context.put("farmerVillage", farmer.getVillage());
        context.put("cropType", farmer.getCropType());
        
        if (!activeBookings.isEmpty()) {
            Booking active = activeBookings.get(0);
            context.put("activeToken", "KF-" + active.getTokenNumber());
            context.put("tokenStatus", active.getStatus());
            context.put("centreName", active.getCentre().getName());
            context.put("bookingDate", active.getBookingDate().toString());
            
            try {
                var queueData = bookingService.queue(active.getCentre().getId());
                context.put("mandiCurrentQueueStatus", queueData.getPendingCount() + " farmers waiting.");
                context.put("mandiEstimatedWaitMinutes", queueData.getEstimatedWaitMinutes());
            } catch (Exception e) {
                // ignore
            }
        } else {
            context.put("activeToken", "None");
        }

        Map<String, Object> request = new HashMap<>();
        request.put("query", query);
        request.put("language", language != null ? language : "en");
        request.put("farmerMobile", farmer.getMobileNumber());
        request.put("context", context);

        return aiClient.chat(request).block();
    }
}
