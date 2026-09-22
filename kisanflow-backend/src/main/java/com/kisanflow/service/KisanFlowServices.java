package com.kisanflow.service;

import com.kisanflow.dto.KisanFlowDtos.*;
import com.kisanflow.entity.KisanFlowEntities.*;
import com.kisanflow.repository.KisanFlowRepositories.*;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.context.ApplicationEventPublisher;
import java.security.SecureRandom;
import java.time.*;
import java.util.*;
import com.kisanflow.realtime.RealtimeEventPublisher;
import static com.kisanflow.dto.KisanFlowDtos.*;

public final class KisanFlowServices {
    private KisanFlowServices() {}
    static final Set<String> ACTIVE = Set.of("token_generated", "arrived", "weighing", "quality_check", "procurement", "payment_processing");
    static final List<String> PIPELINE = List.of("token_generated", "arrived", "weighing", "quality_check", "procurement", "payment_processing", "payment_released");
    static <T> T required(Optional<T> value, String type, UUID id) { return value.orElseThrow(() -> new EntityNotFoundException(type + " not found: " + id)); }

    @Service @RequiredArgsConstructor
    public static class FarmerService {
        private final FarmerRepository repository;
        @Transactional public FarmerResponse create(FarmerRequest r) { return map(repository.save(Farmer.builder().name(r.getName()).mobileNumber(r.getMobileNumber()).village(r.getVillage()).cropType(r.getCropType()).preferredLanguage(r.getPreferredLanguage()).build())); }
        @Transactional(readOnly = true) public List<FarmerResponse> all() { return repository.findAll().stream().map(this::map).toList(); }
        @Transactional(readOnly = true) public FarmerResponse get(UUID id) { return map(required(repository.findById(id), "Farmer", id)); }
        @Transactional public FarmerResponse update(UUID id, FarmerRequest r) { Farmer f=required(repository.findById(id),"Farmer",id); f.setName(r.getName());f.setMobileNumber(r.getMobileNumber());f.setVillage(r.getVillage());f.setCropType(r.getCropType());f.setPreferredLanguage(r.getPreferredLanguage());return map(f); }
        @Transactional public void delete(UUID id) { repository.delete(required(repository.findById(id), "Farmer", id)); }
        private FarmerResponse map(Farmer f) { return FarmerResponse.builder().id(f.getId()).name(f.getName()).mobileNumber(f.getMobileNumber()).village(f.getVillage()).cropType(f.getCropType()).preferredLanguage(f.getPreferredLanguage()).build(); }
    }

    @Service @RequiredArgsConstructor
    public static class CentreService {
        private final CentreRepository repository;
        @Transactional public CentreResponse create(CentreRequest r) { return map(repository.save(newCentre(r))); }
        @Transactional(readOnly = true) public List<CentreResponse> all() { return repository.findAll().stream().map(this::map).toList(); }
        @Transactional(readOnly = true) public CentreResponse get(UUID id) { return map(required(repository.findById(id),"Centre",id)); }
        @Transactional public CentreResponse update(UUID id,CentreRequest r) { ProcurementCentre c=required(repository.findById(id),"Centre",id); copy(c,r); return map(c); }
        @Transactional public void delete(UUID id) { repository.delete(required(repository.findById(id),"Centre",id)); }
        private ProcurementCentre newCentre(CentreRequest r) { ProcurementCentre c=ProcurementCentre.builder().build();copy(c,r);return c; }
        private void copy(ProcurementCentre c,CentreRequest r) { c.setName(r.getName());c.setAddress(r.getAddress());c.setLatitude(r.getLatitude());c.setLongitude(r.getLongitude());c.setCapacity(r.getCapacity());c.setStaffCount(r.getStaffCount());c.setCurrentLoad(r.getCurrentLoad());c.setProcessingSpeed(r.getProcessingSpeed());c.setStatus(r.getStatus()==null?"active":r.getStatus()); }
        private CentreResponse map(ProcurementCentre c) { return CentreResponse.builder().id(c.getId()).name(c.getName()).address(c.getAddress()).latitude(c.getLatitude()).longitude(c.getLongitude()).capacity(c.getCapacity()).staffCount(c.getStaffCount()).currentLoad(c.getCurrentLoad()).processingSpeed(c.getProcessingSpeed()).status(c.getStatus()).build(); }
    }

    @Service @RequiredArgsConstructor
    public static class CropPriceService {
        private final CropPriceRepository prices;
        private final CentreRepository centres;
        private final BookingRepository bookings;
        private final RealtimeEventPublisher publisher;

        @Transactional(readOnly = true) public List<CropPriceResponse> all(UUID centreId) {
            required(centres.findById(centreId), "Centre", centreId);
            return prices.findByCentreIdOrderByCropType(centreId).stream().map(this::map).toList();
        }

        @Transactional public CropPriceResponse update(UUID centreId, CropPriceRequest request, String updatedBy) {
            ProcurementCentre centre = required(centres.findById(centreId), "Centre", centreId);
            CropPrice price = prices.findByCentreIdAndCropType(centreId, request.getCropType().trim())
                .orElseGet(() -> CropPrice.builder().centre(centre).cropType(request.getCropType().trim()).build());
            price.setPrice(request.getPrice());
            price.setUpdatedBy(updatedBy);
            CropPriceResponse response = map(prices.save(price));
            publisher.publishCentreEvent(centreId, "/prices", "PRICE_UPDATED", response);
            bookings.findByCentreIdAndBookingDateAndStatusInOrderByTokenNumber(centreId, LocalDate.now(), ACTIVE).stream()
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
        private final BookingRepository bookings; private final FarmerRepository farmers; private final CentreRepository centres; private final StatusLogRepository logs; private final QueueSnapshotRepository snapshots; private final ApplicationEventPublisher events; private final TokenSequenceRepository tokenSequences;
        private final com.kisanflow.repository.KisanFlowRepositories.MandiEntryExitRepository entryExits;
        /** Entropy source for qrId generation. */
        private static final SecureRandom RANDOM = new SecureRandom();

        private static String generateQrId() {
            byte[] bytes = new byte[16];
            RANDOM.nextBytes(bytes);
            StringBuilder sb = new StringBuilder(32);
            for (byte b : bytes) sb.append(String.format("%02x", b));
            return sb.toString();
        }

        @Transactional public BookingResponse create(BookingRequest r) {
            Farmer farmer = required(farmers.findById(r.getFarmerId()), "Farmer", r.getFarmerId());
            ProcurementCentre centre = required(centres.findById(r.getCentreId()), "Centre", r.getCentreId());
            int maxAttempts = 5;
            DataIntegrityViolationException lastEx = null;
            for (int attempt = 0; attempt < maxAttempts; attempt++) {
                try {
                    TokenSequence seq = tokenSequences.lockSequence(centre.getId(), r.getBookingDate())
                        .orElseGet(() -> TokenSequence.builder().centre(centre).bookingDate(r.getBookingDate()).lastToken(0).build());
                    seq.setLastToken(seq.getLastToken() + 1);
                    tokenSequences.save(seq);

                    Booking b = bookings.save(
                        Booking.builder()
                            .farmer(farmer).centre(centre)
                            .bookingDate(r.getBookingDate()).timeSlot(r.getTimeSlot())
                            .produceQuantity(r.getProduceQuantity())
                            .tokenNumber(seq.getLastToken())
                            .status("token_generated").bookingType("NORMAL")
                            .qrId(generateQrId()).qrVersion(1)
                            .build());
                    logs.save(ProcurementStatusLog.builder().booking(b).stage("token_generated").timestamp(OffsetDateTime.now()).build());
                    events.publishEvent(new BookingStateChanged(b.getId(), b.getFarmer().getId(), b.getCentre().getId(), b.getStatus()));
                    return map(b);
                } catch (DataIntegrityViolationException ex) {
                    lastEx = ex;
                    // Retry on duplicate tokenNumber or qrId — DB UNIQUE constraint is the true guard
                }
            }
            throw new IllegalStateException("Failed to generate a unique token after " + maxAttempts + " attempts", lastEx);
        }
        @Transactional(readOnly=true) public BookingResponse get(UUID id) { return map(required(bookings.findById(id),"Booking",id)); }
        @Transactional(readOnly=true) public List<BookingResponse> farmerActive(UUID farmerId) { return bookings.findByFarmerIdAndStatusIn(farmerId,ACTIVE).stream().map(this::map).toList(); }
        @Transactional(readOnly=true) public QueueResponse queue(UUID centreId) { 
            ProcurementCentre centre = required(centres.findById(centreId),"Centre",centreId);
            List<Booking> activeBookings = bookings.findByCentreIdAndBookingDateAndStatusInOrderByTokenNumber(centreId, LocalDate.now(), ACTIVE);
            QueueSnapshot snapshot = snapshots.findFirstByCentreIdOrderByTimestampDesc(centreId).orElse(null);
            int activeCounters = Math.max(1, Optional.ofNullable(centre.getStaffCount()).orElse(1));
            int waitMins = centre.getProcessingSpeed() != null && centre.getProcessingSpeed().signum() > 0
                ? (int) Math.ceil(activeBookings.size() * 60.0 / (centre.getProcessingSpeed().doubleValue() * activeCounters)) : 0;
            int farmerCount = (int) activeBookings.stream().map(b -> b.getFarmer().getId()).distinct().count();
            return QueueResponse.builder().centreId(centreId)
                .currentServingToken(activeBookings.isEmpty() ? null : "A" + (100 + activeBookings.get(0).getTokenNumber()))
                .nextUpTokens(activeBookings.stream().skip(1).limit(5).map(b -> "A" + (100 + b.getTokenNumber())).toList())
                .currentToken(activeBookings.isEmpty() ? null : activeBookings.get(0).getTokenNumber())
                .processedCount(snapshot == null ? 0 : snapshot.getProcessedCount())
                .pendingCount(activeBookings.size()).activeCounters(activeCounters).activeFarmerCount(farmerCount)
                .totalActiveTokens(activeBookings.size()).estimatedWaitMinutes(waitMins).timestamp(OffsetDateTime.now()).build(); 
        }
        @Transactional(readOnly=true) public List<BookingResponse> centreActive(UUID centreId) {
            // Look back 7 days so test/demo bookings from previous days still show up
            LocalDate from = LocalDate.now().minusDays(7);
            return bookings.findByCentreIdAndBookingDateBetweenAndStatusInOrderByTokenNumber(centreId, from, LocalDate.now(), ACTIVE).stream().map(this::map).toList();
        }
        @Transactional public BookingResponse advance(UUID id, StatusUpdateRequest r) {
            Booking b = required(bookings.findById(id), "Booking", id);
            String next = r.getStage().toLowerCase(Locale.ROOT);
            int current = PIPELINE.indexOf(b.getStatus());
            int target = PIPELINE.indexOf(next);
            // Allow any forward or same-level transition (not just strict +1) for officer flexibility
            if (!PIPELINE.contains(next) || current < 0 || target < current)
                throw new IllegalStateException("Invalid stage: can only move forward in pipeline. Current: " + b.getStatus() + ", requested: " + next);
            b.setStatus(next);
            b.setCurrentCounter(r.getCurrentCounter());
            b.setNextCounter(r.getNextCounter());
            b.setNextProcess(r.getNextProcess());
            b.setOfficerInstruction(r.getInstruction());
            logs.save(ProcurementStatusLog.builder().booking(b).stage(next).timestamp(OffsetDateTime.now()).currentCounter(r.getCurrentCounter()).nextCounter(r.getNextCounter()).nextProcess(r.getNextProcess()).officerInstruction(r.getInstruction()).build());
            events.publishEvent(new BookingStateChanged(b.getId(), b.getFarmer().getId(), b.getCentre().getId(), next));
            return map(b);
        }
        @Transactional(readOnly=true) public List<StatusLogResponse> history(UUID id) { get(id); return logs.findByBookingIdOrderByTimestampAsc(id).stream().map(l->StatusLogResponse.builder().stage(l.getStage()).timestamp(l.getTimestamp()).build()).toList(); }
        private BookingResponse map(Booking b) {
            com.kisanflow.entity.KisanFlowEntities.MandiEntryExit mee = entryExits.findByBookingId(b.getId()).orElse(null);
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
                // Gate entry/exit data from MandiEntryExit (null-safe)
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
