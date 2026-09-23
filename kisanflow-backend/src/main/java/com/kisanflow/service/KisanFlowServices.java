package com.kisanflow.service;

import com.kisanflow.demo.InMemoryDemoStore;
import com.kisanflow.dto.KisanFlowDtos.*;
import com.kisanflow.entity.KisanFlowEntities.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.context.ApplicationEventPublisher;
import java.security.SecureRandom;
import java.time.*;
import java.util.*;
import java.util.stream.Collectors;
import com.kisanflow.realtime.RealtimeEventPublisher;

public final class KisanFlowServices {
    private KisanFlowServices() {}
    static final Set<String> ACTIVE = Set.of("token_generated", "arrived", "weighing", "quality_check", "procurement", "payment_processing");
    static final List<String> PIPELINE = List.of("token_generated", "arrived", "weighing", "quality_check", "procurement", "payment_processing", "payment_released");
    
    static <T> T required(T value, String type, UUID id) { 
        if (value == null) throw new IllegalArgumentException(type + " not found: " + id);
        return value; 
    }

    @Service @RequiredArgsConstructor
    public static class FarmerService {
        private final InMemoryDemoStore store;
        
        public FarmerResponse create(FarmerRequest r) { 
            Farmer f = Farmer.builder().id(UUID.randomUUID()).name(r.getName()).mobileNumber(r.getMobileNumber()).village(r.getVillage()).cropType(r.getCropType()).preferredLanguage(r.getPreferredLanguage()).createdAt(OffsetDateTime.now()).build();
            store.saveFarmer(f);
            return map(f); 
        }
        public List<FarmerResponse> all() { return store.getAllFarmers().stream().map(this::map).toList(); }
        public FarmerResponse get(UUID id) { return map(required(store.getFarmerById(id), "Farmer", id)); }
        public FarmerResponse update(UUID id, FarmerRequest r) { 
            Farmer f = required(store.getFarmerById(id),"Farmer",id); 
            f.setName(r.getName());f.setMobileNumber(r.getMobileNumber());f.setVillage(r.getVillage());f.setCropType(r.getCropType());f.setPreferredLanguage(r.getPreferredLanguage());
            return map(f); 
        }
        public void delete(UUID id) { required(store.getFarmerById(id), "Farmer", id); /* Dummy delete for demo */ }
        private FarmerResponse map(Farmer f) { return FarmerResponse.builder().id(f.getId()).name(f.getName()).mobileNumber(f.getMobileNumber()).village(f.getVillage()).cropType(f.getCropType()).preferredLanguage(f.getPreferredLanguage()).build(); }
    }

    @Service @RequiredArgsConstructor
    public static class CentreService {
        private final InMemoryDemoStore store;
        
        public CentreResponse create(CentreRequest r) { 
            ProcurementCentre c = newCentre(r);
            c.setId(UUID.randomUUID());
            c.setCreatedAt(OffsetDateTime.now());
            c.setUpdatedAt(OffsetDateTime.now());
            store.saveCentre(c);
            return map(c); 
        }
        public List<CentreResponse> all() { return store.getAllCentres().stream().map(this::map).toList(); }
        public CentreResponse get(UUID id) { return map(required(store.getCentreById(id),"Centre",id)); }
        public CentreResponse update(UUID id,CentreRequest r) { 
            ProcurementCentre c = required(store.getCentreById(id),"Centre",id); 
            copy(c,r); 
            c.setUpdatedAt(OffsetDateTime.now());
            return map(c); 
        }
        public void delete(UUID id) { required(store.getCentreById(id), "Centre", id); /* Dummy delete for demo */ }
        private ProcurementCentre newCentre(CentreRequest r) { ProcurementCentre c=ProcurementCentre.builder().build();copy(c,r);return c; }
        private void copy(ProcurementCentre c,CentreRequest r) { c.setName(r.getName());c.setAddress(r.getAddress());c.setLatitude(r.getLatitude());c.setLongitude(r.getLongitude());c.setCapacity(r.getCapacity());c.setStaffCount(r.getStaffCount());c.setCurrentLoad(r.getCurrentLoad());c.setProcessingSpeed(r.getProcessingSpeed());c.setStatus(r.getStatus()==null?"active":r.getStatus()); }
        private CentreResponse map(ProcurementCentre c) { return CentreResponse.builder().id(c.getId()).name(c.getName()).district(c.getDistrict()).state(c.getState()).distanceKm(Math.abs(c.getId().hashCode()) % 15 + 10.5).address(c.getAddress()).latitude(c.getLatitude()).longitude(c.getLongitude()).capacity(c.getCapacity()).staffCount(c.getStaffCount()).currentLoad(c.getCurrentLoad()).processingSpeed(c.getProcessingSpeed()).status(c.getStatus()).build(); }
    }

    @Service @RequiredArgsConstructor
    public static class CropPriceService {
        private final InMemoryDemoStore store;
        private final RealtimeEventPublisher publisher;

        public List<CropPriceResponse> all(UUID centreId) {
            required(store.getCentreById(centreId), "Centre", centreId);
            return store.getAllCropPrices().stream()
                .filter(p -> p.getCentre().getId().equals(centreId))
                .sorted(Comparator.comparing(CropPrice::getCropType))
                .map(this::map).toList();
        }

        public CropPriceResponse update(UUID centreId, CropPriceRequest request, String updatedBy) {
            ProcurementCentre centre = required(store.getCentreById(centreId), "Centre", centreId);
            CropPrice price = store.getAllCropPrices().stream()
                .filter(p -> p.getCentre().getId().equals(centreId) && p.getCropType().equalsIgnoreCase(request.getCropType().trim()))
                .findFirst()
                .orElseGet(() -> CropPrice.builder().id(UUID.randomUUID()).centre(centre).cropType(request.getCropType().trim()).build());
            
            price.setPrice(request.getPrice());
            price.setUpdatedBy(updatedBy);
            price.setUpdatedAt(OffsetDateTime.now());
            store.saveCropPrice(price);
            
            CropPriceResponse response = map(price);
            publisher.publishCentreEvent(centreId, "/prices", "PRICE_UPDATED", response);
            
            store.getAllBookings().stream()
                .filter(b -> b.getCentre().getId().equals(centreId) && b.getBookingDate().equals(LocalDate.now()) && ACTIVE.contains(b.getStatus()))
                .map(Booking::getFarmer).map(Farmer::getId).distinct()
                .forEach(farmerId -> publisher.publishFarmerEvent(farmerId, "/notification", "PRICE_UPDATED", Map.of(
                    "cropType", response.getCropType(), "price", response.getPrice(),
                    "message", response.getCropType() + " price updated to Rs " + response.getPrice() + " per quintal")));
            return response;
        }

        private CropPriceResponse map(CropPrice price) { return CropPriceResponse.builder().id(price.getId()).centreId(price.getCentre().getId()).cropType(price.getCropType()).price(price.getPrice()).updatedBy(price.getUpdatedBy()).updatedAt(price.getUpdatedAt()).build(); }
    }

    @Service @RequiredArgsConstructor
    public static class BookingService {
        private final InMemoryDemoStore store;
        private final ApplicationEventPublisher events;
        private static final SecureRandom RANDOM = new SecureRandom();

        private static String generateQrId() {
            byte[] bytes = new byte[16];
            RANDOM.nextBytes(bytes);
            StringBuilder sb = new StringBuilder(32);
            for (byte b : bytes) sb.append(String.format("%02x", b));
            return "KFQR-" + sb.toString().substring(0, 8).toUpperCase();
        }

        public BookingResponse create(BookingRequest r) {
            Farmer farmer = required(store.getFarmerById(r.getFarmerId()), "Farmer", r.getFarmerId());
            ProcurementCentre centre = required(store.getCentreById(r.getCentreId()), "Centre", r.getCentreId());
            
            int token = store.generateNextToken(centre.getId(), r.getBookingDate());
            
            Booking b = Booking.builder()
                .id(UUID.randomUUID())
                .farmer(farmer).centre(centre)
                .bookingDate(r.getBookingDate()).timeSlot(r.getTimeSlot())
                .produceQuantity(r.getProduceQuantity())
                .tokenNumber(token)
                .status("token_generated").bookingType("NORMAL")
                .qrId(generateQrId()).qrVersion(1)
                .createdAt(OffsetDateTime.now())
                .updatedAt(OffsetDateTime.now())
                .build();
            
            store.saveBooking(b);
            events.publishEvent(new BookingStateChanged(b.getId(), b.getFarmer().getId(), b.getCentre().getId(), b.getStatus()));
            return map(b);
        }
        
        public BookingResponse get(UUID id) { return map(required(store.getBookingById(id),"Booking",id)); }
        
        public List<BookingResponse> farmerActive(UUID farmerId) { 
            return store.getAllBookings().stream()
                .filter(b -> b.getFarmer().getId().equals(farmerId) && ACTIVE.contains(b.getStatus()))
                .map(this::map).toList(); 
        }
        
        public QueueResponse queue(UUID centreId) { 
            ProcurementCentre centre = required(store.getCentreById(centreId),"Centre",centreId);
            List<Booking> activeBookings = store.getAllBookings().stream()
                .filter(b -> b.getCentre().getId().equals(centreId) && b.getBookingDate().equals(LocalDate.now()) && ACTIVE.contains(b.getStatus()))
                .sorted(Comparator.comparing(Booking::getTokenNumber))
                .toList();
                
            int activeCounters = Math.max(1, Optional.ofNullable(centre.getStaffCount()).orElse(1));
            int waitMins = centre.getProcessingSpeed() != null && centre.getProcessingSpeed().signum() > 0
                ? (int) Math.ceil(activeBookings.size() * 60.0 / (centre.getProcessingSpeed().doubleValue() * activeCounters)) : 0;
            int farmerCount = (int) activeBookings.stream().map(b -> b.getFarmer().getId()).distinct().count();
            
            return QueueResponse.builder().centreId(centreId)
                .currentServingToken(activeBookings.isEmpty() ? null : "A" + (100 + activeBookings.get(0).getTokenNumber()))
                .nextUpTokens(activeBookings.stream().skip(1).limit(5).map(b -> "A" + (100 + b.getTokenNumber())).toList())
                .currentToken(activeBookings.isEmpty() ? null : activeBookings.get(0).getTokenNumber())
                .processedCount(0)
                .pendingCount(activeBookings.size()).activeCounters(activeCounters).activeFarmerCount(farmerCount)
                .totalActiveTokens(activeBookings.size()).estimatedWaitMinutes(waitMins).timestamp(OffsetDateTime.now()).build(); 
        }
        
        public List<BookingResponse> centreActive(UUID centreId) {
            LocalDate from = LocalDate.now().minusDays(7);
            return store.getAllBookings().stream()
                .filter(b -> b.getCentre().getId().equals(centreId) && 
                             (b.getBookingDate().isEqual(from) || b.getBookingDate().isAfter(from)) && 
                             (b.getBookingDate().isEqual(LocalDate.now()) || b.getBookingDate().isBefore(LocalDate.now())) && 
                             ACTIVE.contains(b.getStatus()))
                .sorted(Comparator.comparing(Booking::getTokenNumber))
                .map(this::map).toList();
        }
        
        public BookingResponse advance(UUID id, StatusUpdateRequest r) {
            Booking b = required(store.getBookingById(id), "Booking", id);
            String next = r.getStage().toLowerCase(Locale.ROOT);
            int current = PIPELINE.indexOf(b.getStatus());
            int target = PIPELINE.indexOf(next);
            
            if (!PIPELINE.contains(next) || current < 0 || target < current)
                throw new IllegalStateException("Invalid stage: can only move forward in pipeline. Current: " + b.getStatus() + ", requested: " + next);
            
            b.setStatus(next);
            b.setCurrentCounter(r.getCurrentCounter());
            b.setNextCounter(r.getNextCounter());
            b.setNextProcess(r.getNextProcess());
            b.setOfficerInstruction(r.getInstruction());
            b.setUpdatedAt(OffsetDateTime.now());
            
            events.publishEvent(new BookingStateChanged(b.getId(), b.getFarmer().getId(), b.getCentre().getId(), next));
            return map(b);
        }
        
        public List<StatusLogResponse> history(UUID id) { 
            get(id); 
            // In demo mode, we just return empty or synthesize from status
            return List.of(); 
        }
        
        private BookingResponse map(Booking b) {
            MandiEntryExit mee = store.getMandiEntryExitByBookingId(b.getId());
            return BookingResponse.builder()
                .id(b.getId()).farmerId(b.getFarmer().getId()).farmerName(b.getFarmer().getName())
                .farmerMobileNumber(b.getFarmer().getMobileNumber()).farmerVillage(b.getFarmer().getVillage())
                .centreId(b.getCentre().getId()).emergencySlotId(b.getEmergencySlotId())
                .bookingDate(b.getBookingDate()).timeSlot(b.getTimeSlot())
                .originalDate(b.getOriginalDate()).originalTime(b.getOriginalTime())
                .produceQuantity(b.getProduceQuantity()).tokenNumber(b.getTokenNumber())
                .status(b.getStatus()).bookingType(b.getBookingType()).weatherAffected(b.isWeatherAffected())
                .reschedulingStatus(b.getReschedulingStatus()).weatherReason(b.getWeatherReason())
                .rescheduledAt(b.getRescheduledAt()).createdAt(b.getCreatedAt())
                .currentCounter(b.getCurrentCounter()).nextCounter(b.getNextCounter())
                .nextProcess(b.getNextProcess()).officerInstruction(b.getOfficerInstruction())
                .qrId(b.getQrId()).qrVersion(b.getQrVersion())
                .entryStatus(mee != null ? mee.getEntryStatus() : "PENDING")
                .exitStatus(mee != null ? mee.getExitStatus() : "NOT_EXITED")
                .insideMandi(mee != null && Boolean.TRUE.equals(mee.getInsideMandi()))
                .entryTime(mee != null ? mee.getEntryTime() : null)
                .exitTime(mee != null ? mee.getExitTime() : null)
                .build();
        }
    }
    public record BookingStateChanged(UUID bookingId, UUID farmerId, UUID centreId, String status) {}
}
