package com.kisanflow.service;

import com.kisanflow.dto.KisanFlowDtos.*;
import com.kisanflow.entity.KisanFlowEntities.*;
import com.kisanflow.repository.KisanFlowRepositories.*;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.kisanflow.realtime.RealtimeEventPublisher;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.*;
import org.springframework.context.ApplicationEventPublisher;
import com.kisanflow.notification.NotificationModule.GateEvent;

/**
 * Handles physical entry/exit at the mandi gate via QR scan.
 *
 * State machine per booking:
 *   PENDING  --[entry scan]--> ENTERED (insideMandi=true)
 *   ENTERED  --[exit  scan]--> EXITED  (insideMandi=false)
 *   EXITED   --[any   scan]--> error "already exited"
 *
 * Concurrent scan safety: MandiEntryExitRepository.lockByBookingId() uses
 * PESSIMISTIC_WRITE so two simultaneous scans of the same QR cannot race.
 */
@Service
@RequiredArgsConstructor
public class QrEntryExitService {

    private final MandiEntryExitRepository entryExitRepo;
    private final com.kisanflow.repository.KisanFlowRepositories.BookingRepository bookingRepo;
    private final com.kisanflow.repository.KisanFlowRepositories.CentreRepository centreRepo;
    private final RealtimeEventPublisher publisher;
    private final ApplicationEventPublisher appEventPublisher;

    // ──────────────────────────────────────────────────────────────────────────
    // QR Scan — smart entry/exit
    // ──────────────────────────────────────────────────────────────────────────

    @Transactional
    public QrScanResponse scan(String rawQrId, UUID officerCentreId) {
        // Strip optional "KFQR:" or "A" prefix (frontend embeds it for visual clarity)
        String cleanedId = rawQrId;
        if (cleanedId.startsWith("KFQR:")) cleanedId = cleanedId.substring(5);
        if (cleanedId.startsWith("A")) cleanedId = cleanedId.substring(1);

        Booking booking = null;

        // Try to parse as Token Number
        try {
            int tokenNumber = Integer.parseInt(cleanedId);
            booking = bookingRepo.findByCentreIdAndBookingDateAndTokenNumber(officerCentreId, LocalDate.now(), tokenNumber)
                .orElse(null);
        } catch (NumberFormatException ignored) {}

        // If not found by token number, try resolving as QR UUID
        if (booking == null) {
            String finalQrId = rawQrId.startsWith("KFQR:") ? rawQrId.substring(5) : rawQrId;
            booking = bookingRepo.findAll().stream()
                .filter(b -> finalQrId.equals(b.getQrId()))
                .findFirst()
                .orElseThrow(() -> new EntityNotFoundException("No valid booking found for input: " + rawQrId));
        }

        // Validate that the token belongs to the officer's centre
        if (!booking.getCentre().getId().equals(officerCentreId)) {
            throw new IllegalArgumentException("This token belongs to a different mandi (" + booking.getCentre().getName() + ") and cannot be processed here.");
        }
        
        // Validate booking status is not cancelled
        if ("CANCELLED".equalsIgnoreCase(booking.getStatus())) {
            throw new IllegalArgumentException("This booking has been cancelled.");
        }
        
        String qrId = booking.getQrId();

        // Acquire pessimistic lock on the entry/exit record for this booking
        Optional<MandiEntryExit> existingOpt = entryExitRepo.lockByBookingId(booking.getId());

        MandiEntryExit record;
        String event;
        String message;

        if (existingOpt.isEmpty()) {
            // First scan — create ENTERED record
            record = MandiEntryExit.builder()
                .booking(booking)
                .farmer(booking.getFarmer())
                .centre(booking.getCentre())
                .qrId(qrId)
                .entryTime(OffsetDateTime.now())
                .insideMandi(true)
                .entryStatus("ENTERED")
                .exitStatus("NOT_EXITED")
                .build();
            event = "GATE_ENTRY";
            message = "✅ Entry recorded. Welcome to " + booking.getCentre().getName() + "!";
        } else {
            record = existingOpt.get();
            switch (record.getEntryStatus()) {
                case "PENDING", "ENTERED" -> {
                    if (Boolean.TRUE.equals(record.getInsideMandi())) {
                        // Inside → scan again = EXIT
                        record.setExitTime(OffsetDateTime.now());
                        record.setInsideMandi(false);
                        record.setEntryStatus("EXITED");
                        record.setExitStatus("EXITED");
                        event = "GATE_EXIT";
                        message = "✅ Exit recorded. Safe travels!";
                    } else {
                        // Already exited once but scanning again — re-entry not allowed per session
                        return QrScanResponse.builder()
                            .event("ALREADY_EXITED")
                            .farmerName(booking.getFarmer().getName())
                            .token("A" + (100 + booking.getTokenNumber()))
                            .mandiName(booking.getCentre().getName())
                            .entryTime(record.getEntryTime())
                            .exitTime(record.getExitTime())
                            .entryStatus(record.getEntryStatus())
                            .currentOccupancy(currentOccupancy(booking.getCentre().getId()))
                            .message("⚠️ This token has already exited. Re-entry not permitted.")
                            .build();
                    }
                }
                case "EXITED" -> {
                    return QrScanResponse.builder()
                        .event("ALREADY_EXITED")
                        .farmerName(booking.getFarmer().getName())
                        .token("A" + (100 + booking.getTokenNumber()))
                        .mandiName(booking.getCentre().getName())
                        .entryTime(record.getEntryTime())
                        .exitTime(record.getExitTime())
                        .entryStatus("EXITED")
                        .currentOccupancy(currentOccupancy(booking.getCentre().getId()))
                        .message("⚠️ This token has already exited.")
                        .build();
                }
                default -> throw new IllegalStateException("Unknown entry status: " + record.getEntryStatus());
            }
        }

        entryExitRepo.save(record);

        long occupancy = currentOccupancy(booking.getCentre().getId());
        UUID centreId = booking.getCentre().getId();

        // Broadcast to officer dashboard
        publisher.publishCentreEvent(centreId, "/entry-exit", event, Map.of(
            "farmerName", booking.getFarmer().getName(),
            "token", "A" + (100 + booking.getTokenNumber()),
            "centreId", centreId.toString()
        ));

        // Broadcast updated occupancy
        broadcastOccupancy(centreId, occupancy, booking.getCentre().getCapacity());

        // Notify the farmer's personal topic
        publisher.publishFarmerEvent(booking.getFarmer().getId(), "/mandi-status", "MANDI_STATUS_UPDATED", Map.of(
            "entryStatus", record.getEntryStatus(),
            "exitStatus", record.getExitStatus(),
            "insideMandi", record.getInsideMandi(),
            "entryTime", record.getEntryTime() != null ? record.getEntryTime().toString() : "",
            "exitTime",  record.getExitTime()  != null ? record.getExitTime().toString()  : ""
        ));
        
        // Dispatch Notification Event
        appEventPublisher.publishEvent(new GateEvent(booking.getFarmer().getId(), centreId, event, message));

        return QrScanResponse.builder()
            .event(event)
            .farmerName(booking.getFarmer().getName())
            .token("A" + (100 + booking.getTokenNumber()))
            .mandiName(booking.getCentre().getName())
            .entryTime(record.getEntryTime())
            .exitTime(record.getExitTime())
            .entryStatus(record.getEntryStatus())
            .currentOccupancy(occupancy)
            .message(message)
            .build();
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Occupancy — always computed from DB
    // ──────────────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public OccupancyResponse occupancy(UUID centreId) {
        ProcurementCentre centre = centreRepo.findById(centreId)
            .orElseThrow(() -> new EntityNotFoundException("Centre not found: " + centreId));
        long inside = currentOccupancy(centreId);
        int capacity = Optional.ofNullable(centre.getCapacity()).orElse(0);
        return OccupancyResponse.builder()
            .centreId(centreId)
            .centreName(centre.getName())
            .insideCount(inside)
            .capacity(capacity)
            .available(Math.max(0, capacity - inside))
            .build();
    }

    /** QR data for a single booking (farmer-facing). */
    @Transactional(readOnly = true)
    public Map<String, Object> bookingQr(UUID bookingId) {
        Booking b = bookingRepo.findById(bookingId)
            .orElseThrow(() -> new EntityNotFoundException("Booking not found: " + bookingId));
        Optional<MandiEntryExit> ee = entryExitRepo.findByBookingId(bookingId);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("qrId", b.getQrId());
        result.put("qrVersion", b.getQrVersion());
        result.put("qrPayload", "KFQR:" + b.getQrId());
        result.put("tokenNumber", b.getTokenNumber());
        result.put("entryStatus", ee.map(MandiEntryExit::getEntryStatus).orElse("PENDING"));
        result.put("exitStatus",  ee.map(MandiEntryExit::getExitStatus).orElse("NOT_EXITED"));
        result.put("insideMandi", ee.map(MandiEntryExit::getInsideMandi).orElse(false));
        result.put("entryTime",   ee.map(MandiEntryExit::getEntryTime).orElse(null));
        result.put("exitTime",    ee.map(MandiEntryExit::getExitTime).orElse(null));
        return result;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Helpers
    // ──────────────────────────────────────────────────────────────────────────

    private long currentOccupancy(UUID centreId) {
        return entryExitRepo.countByCentreIdAndInsideMandi(centreId, true);
    }

    private void broadcastOccupancy(UUID centreId, long inside, Integer capacity) {
        publisher.publishCentreEvent(centreId, "/occupancy", "MANDI_OCCUPANCY_UPDATED", Map.of(
            "centreId", centreId.toString(),
            "insideCount", inside,
            "capacity", Optional.ofNullable(capacity).orElse(0)
        ));
    }
}
