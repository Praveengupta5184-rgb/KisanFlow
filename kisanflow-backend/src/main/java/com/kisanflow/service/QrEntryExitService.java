package com.kisanflow.service;

import com.kisanflow.demo.InMemoryDemoStore;
import com.kisanflow.dto.KisanFlowDtos.*;
import com.kisanflow.entity.KisanFlowEntities.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import com.kisanflow.realtime.RealtimeEventPublisher;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.*;
import org.springframework.context.ApplicationEventPublisher;
import com.kisanflow.notification.NotificationModule.GateEvent;

@Service
@RequiredArgsConstructor
public class QrEntryExitService {

    private final InMemoryDemoStore store;
    private final RealtimeEventPublisher publisher;
    private final ApplicationEventPublisher appEventPublisher;

    public synchronized QrScanResponse scan(String rawQrId, UUID officerCentreId) {
        String cleanedId = rawQrId;
        if (cleanedId.startsWith("KFQR:")) cleanedId = cleanedId.substring(5);
        if (cleanedId.startsWith("A")) cleanedId = cleanedId.substring(1);

        Booking booking = null;

        try {
            int tokenNumber = Integer.parseInt(cleanedId);
            booking = store.getAllBookings().stream()
                .filter(b -> b.getCentre().getId().equals(officerCentreId) && b.getBookingDate().equals(LocalDate.now()) && b.getTokenNumber() == tokenNumber)
                .findFirst()
                .orElse(null);
        } catch (NumberFormatException ignored) {}

        if (booking == null) {
            String finalQrId = rawQrId.startsWith("KFQR:") ? rawQrId.substring(5) : rawQrId;
            booking = store.getAllBookings().stream()
                .filter(b -> finalQrId.equals(b.getQrId()))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("No valid booking found for input: " + rawQrId));
        }

        if (!booking.getCentre().getId().equals(officerCentreId)) {
            throw new IllegalArgumentException("This token belongs to a different mandi (" + booking.getCentre().getName() + ") and cannot be processed here.");
        }
        
        if ("CANCELLED".equalsIgnoreCase(booking.getStatus())) {
            throw new IllegalArgumentException("This booking has been cancelled.");
        }
        
        String qrId = booking.getQrId();
        MandiEntryExit existingOpt = store.getMandiEntryExitByBookingId(booking.getId());
        MandiEntryExit record;
        String event;
        String message;

        if (existingOpt == null) {
            record = MandiEntryExit.builder()
                .id(UUID.randomUUID())
                .booking(booking)
                .farmer(booking.getFarmer())
                .centre(booking.getCentre())
                .qrId(qrId)
                .entryTime(OffsetDateTime.now())
                .insideMandi(true)
                .entryStatus("ENTERED")
                .exitStatus("NOT_EXITED")
                .createdAt(OffsetDateTime.now())
                .updatedAt(OffsetDateTime.now())
                .build();
            event = "GATE_ENTRY";
            message = "✅ Entry recorded. Welcome to " + booking.getCentre().getName() + "!";
        } else {
            record = existingOpt;
            switch (record.getEntryStatus()) {
                case "PENDING", "ENTERED" -> {
                    if (Boolean.TRUE.equals(record.getInsideMandi())) {
                        record.setExitTime(OffsetDateTime.now());
                        record.setInsideMandi(false);
                        record.setEntryStatus("EXITED");
                        record.setExitStatus("EXITED");
                        record.setUpdatedAt(OffsetDateTime.now());
                        event = "GATE_EXIT";
                        message = "✅ Exit recorded. Safe travels!";
                        
                        booking.setStatus("expired");
                        store.saveBooking(booking);
                    } else {
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

        store.saveMandiEntryExit(record);

        long occupancy = currentOccupancy(booking.getCentre().getId());
        UUID centreId = booking.getCentre().getId();

        publisher.publishCentreEvent(centreId, "/entry-exit", event, Map.of(
            "farmerName", booking.getFarmer().getName(),
            "token", "A" + (100 + booking.getTokenNumber()),
            "centreId", centreId.toString()
        ));

        broadcastOccupancy(centreId, occupancy, booking.getCentre().getCapacity());

        publisher.publishFarmerEvent(booking.getFarmer().getId(), "/mandi-status", "MANDI_STATUS_UPDATED", Map.of(
            "entryStatus", record.getEntryStatus(),
            "exitStatus", record.getExitStatus(),
            "insideMandi", record.getInsideMandi(),
            "entryTime", record.getEntryTime() != null ? record.getEntryTime().toString() : "",
            "exitTime",  record.getExitTime()  != null ? record.getExitTime().toString()  : "",
            "bookingStatus", booking.getStatus() != null ? booking.getStatus() : ""
        ));
        
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

    public OccupancyResponse occupancy(UUID centreId) {
        ProcurementCentre centre = store.getCentreById(centreId);
        if (centre == null) throw new IllegalArgumentException("Centre not found: " + centreId);
        long inside = currentOccupancy(centreId);
        int capacity = Optional.ofNullable(centre.getCapacity()).orElse(0);
        return OccupancyResponse.builder()
            .centreId(centreId)
            .centreName(centre.getName())
            .insideCount(inside)
            .capacity(capacity)
            .available(Math.max(0, capacity - (int)inside))
            .build();
    }

    public Map<String, Object> bookingQr(UUID bookingId) {
        Booking b = store.getBookingById(bookingId);
        if (b == null) throw new IllegalArgumentException("Booking not found: " + bookingId);
        MandiEntryExit ee = store.getMandiEntryExitByBookingId(bookingId);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("qrId", b.getQrId());
        result.put("qrVersion", b.getQrVersion());
        result.put("qrPayload", "KFQR:" + b.getQrId());
        result.put("tokenNumber", b.getTokenNumber());
        result.put("entryStatus", ee != null ? ee.getEntryStatus() : "PENDING");
        result.put("exitStatus",  ee != null ? ee.getExitStatus() : "NOT_EXITED");
        result.put("insideMandi", ee != null ? ee.getInsideMandi() : false);
        result.put("entryTime",   ee != null ? ee.getEntryTime() : null);
        result.put("exitTime",    ee != null ? ee.getExitTime() : null);
        return result;
    }

    private long currentOccupancy(UUID centreId) {
        // Just iterate and count for now in demo mode
        return store.getAllBookings().stream()
            .filter(b -> b.getCentre().getId().equals(centreId))
            .map(b -> store.getMandiEntryExitByBookingId(b.getId()))
            .filter(Objects::nonNull)
            .filter(MandiEntryExit::getInsideMandi)
            .count();
    }

    private void broadcastOccupancy(UUID centreId, long inside, Integer capacity) {
        publisher.publishCentreEvent(centreId, "/occupancy", "MANDI_OCCUPANCY_UPDATED", Map.of(
            "centreId", centreId.toString(),
            "insideCount", inside,
            "capacity", Optional.ofNullable(capacity).orElse(0)
        ));
    }
}
