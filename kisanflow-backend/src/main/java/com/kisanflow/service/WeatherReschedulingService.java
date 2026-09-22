package com.kisanflow.service;

import com.kisanflow.dto.KisanFlowDtos.*;
import com.kisanflow.entity.KisanFlowEntities.*;
import com.kisanflow.repository.KisanFlowRepositories.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import com.kisanflow.realtime.RealtimeEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.util.*;

@Service
@RequiredArgsConstructor
public class WeatherReschedulingService {
    private static final Set<String> ACTIVE = Set.of("token_generated", "arrived", "weighing", "quality_check", "procurement", "payment_processing");
    private final BookingRepository bookings;
    private final EmergencySlotRepository emergencySlots;
    private final CentreRepository centres;
    private final RealtimeEventPublisher publisher;

    @Value("${app.weather.severe-dates:}")
    private String severeDates;
    @Value("${app.weather.search-days:30}")
    private int searchDays;
    @Value("${app.weather.emergency-capacity:10}")
    private int emergencyCapacity;
    @Value("${app.weather.alert-enabled:true}")
    private boolean alertEnabled;

    @Transactional
    public List<WeatherAlertResponse> alerts(UUID farmerId) {
        List<WeatherAlertResponse> result = new ArrayList<>();
        for (Booking booking : bookings.findByFarmerIdAndStatusIn(farmerId, ACTIVE)) {
            if (!alertEnabled || !unsafe(booking.getBookingDate(), booking.getTimeSlot())) continue;
            if (Set.of("KEPT", "CANCELLED", "RESCHEDULED").contains(booking.getReschedulingStatus())) continue;
            if (!booking.isWeatherAffected()) {
                booking.setWeatherAffected(true);
                booking.setReschedulingStatus("OFFERED");
                booking.setWeatherReason("Heavy rainfall is expected around your appointment time.");
                bookings.save(booking);
            }
            result.add(alert(booking));
            publisher.publishFarmerEvent(farmerId, "/notification", "WEATHER_RESCHEDULED", Map.of(
                "bookingId", booking.getId(), "token", token(booking),
                "bookingDate", booking.getBookingDate().toString(), "timeSlot", booking.getTimeSlot().toString(),
                "message", booking.getWeatherReason()));
        }
        return result;
    }

    @Transactional
    public BookingResponse keep(UUID bookingId) {
        Booking booking = booking(bookingId);
        if (booking.isWeatherAffected() && !"RESCHEDULED".equals(booking.getReschedulingStatus())) {
            booking.setWeatherAffected(true);
            booking.setReschedulingStatus("KEPT");
            return map(bookings.save(booking));
        }
        return map(booking);
    }

    @Transactional(readOnly = true)
    public void assertOwner(UUID bookingId, UUID farmerId) {
        if (!booking(bookingId).getFarmer().getId().equals(farmerId)) {
            throw new org.springframework.security.access.AccessDeniedException("Booking does not belong to this farmer");
        }
    }

    @Transactional
    public BookingResponse cancel(UUID bookingId) {
        Booking booking = booking(bookingId);
        if (!"RESCHEDULED".equals(booking.getReschedulingStatus())) {
            booking.setStatus("cancelled");
            booking.setWeatherAffected(true);
            booking.setReschedulingStatus("CANCELLED");
            bookings.save(booking);
            publish(booking, "cancelled");
        }
        return map(booking);
    }

    @Transactional
    public BookingResponse reschedule(UUID bookingId) {
        Booking booking = booking(bookingId);
        if ("RESCHEDULED".equals(booking.getReschedulingStatus())) return map(booking);
        if (!booking.isWeatherAffected()) throw new IllegalStateException("This appointment is not weather-affected");

        if (booking.getOriginalDate() == null) {
            booking.setOriginalDate(booking.getBookingDate());
            booking.setOriginalTime(booking.getTimeSlot());
        }
        LocalDate today = LocalDate.now();
        LocalDate startDate = booking.getBookingDate().isBefore(today) ? today : booking.getBookingDate();
        LocalTime startTime = booking.getBookingDate().isEqual(today) ? LocalTime.now().plusMinutes(1) : booking.getTimeSlot();
        EmergencySlot selected = null;
        for (int day = 0; day <= searchDays && selected == null; day++) {
            LocalDate date = startDate.plusDays(day);
            for (LocalTime time : candidateTimes(startTime, date.equals(startDate))) {
                if (unsafe(date, time)) continue;
                EmergencySlot slot = reserveSlot(booking.getCentre(), date, time);
                if (slot != null) { selected = slot; break; }
            }
        }
        if (selected == null) throw new IllegalStateException("No safe emergency slot is available in the next " + searchDays + " days");

        booking.setBookingDate(selected.getSlotDate());
        booking.setTimeSlot(selected.getTimeSlot());
        booking.setBookingType("WEATHER_EMERGENCY");
        booking.setReschedulingStatus("RESCHEDULED");
        booking.setEmergencySlotId(selected.getId());
        booking.setRescheduledAt(OffsetDateTime.now());
        booking.setStatus("token_generated");
        BookingResponse response = map(bookings.save(booking));
        publish(booking, "rescheduled");
        return response;
    }

    @Transactional(readOnly = true)
    public List<EmergencySlotResponse> slots(UUID centreId) {
        LocalDate from = LocalDate.now();
        return emergencySlots.findByCentreIdAndSlotDateBetweenOrderBySlotDateAscTimeSlotAsc(centreId, from, from.plusDays(6))
            .stream().map(this::slotResponse).toList();
    }

    @Transactional(readOnly = true)
    public Map<String, Object> summary(UUID centreId) {
        return Map.of(
            "weatherAffected", bookings.countByCentreIdAndWeatherAffectedTrue(centreId),
            "reschedulingRequested", bookings.countByCentreIdAndReschedulingStatus(centreId, "OFFERED"),
            "automaticallyRescheduled", bookings.countByCentreIdAndReschedulingStatus(centreId, "RESCHEDULED"),
            "cancelled", bookings.countByCentreIdAndReschedulingStatus(centreId, "CANCELLED"),
            "pending", bookings.countByCentreIdAndReschedulingStatus(centreId, "OFFERED")
        );
    }

    private EmergencySlot reserveSlot(ProcurementCentre centre, LocalDate date, LocalTime time) {
        EmergencySlot slot;
        try {
            slot = emergencySlots.lockSlot(centre.getId(), date, time).orElseGet(() -> emergencySlots.saveAndFlush(EmergencySlot.builder()
                .centre(centre).slotDate(date).timeSlot(time).capacity(emergencyCapacity).reservedCount(0).build()));
        } catch (DataIntegrityViolationException race) {
            slot = emergencySlots.lockSlot(centre.getId(), date, time).orElse(null);
        }
        if (slot == null || slot.getReservedCount() >= slot.getCapacity()) return null;
        slot.setReservedCount(slot.getReservedCount() + 1);
        return emergencySlots.save(slot);
    }

    private List<LocalTime> candidateTimes(LocalTime start, boolean sameDate) {
        List<LocalTime> times = new ArrayList<>();
        for (int minutes = 8 * 60; minutes <= 18 * 60; minutes += 30) {
            LocalTime time = LocalTime.of(minutes / 60, minutes % 60);
            if (!sameDate || !time.isBefore(start)) times.add(time);
        }
        return times;
    }

    private boolean unsafe(LocalDate date, LocalTime time) {
        return Arrays.stream(severeDates.split(","))
            .map(String::trim).filter(s -> !s.isBlank()).anyMatch(s -> s.equals(date.toString()) || s.equals(date + "T" + time));
    }

    private Booking booking(UUID id) { return bookings.findById(id).orElseThrow(() -> new NoSuchElementException("Booking not found: " + id)); }
    private WeatherAlertResponse alert(Booking b) { return WeatherAlertResponse.builder().bookingId(b.getId()).centreId(b.getCentre().getId()).centreName(b.getCentre().getName()).token(token(b)).bookingDate(b.getBookingDate()).timeSlot(b.getTimeSlot()).reason(b.getWeatherReason()).affected(true).build(); }
    private EmergencySlotResponse slotResponse(EmergencySlot s) { return EmergencySlotResponse.builder().id(s.getId()).centreId(s.getCentre().getId()).slotDate(s.getSlotDate()).timeSlot(s.getTimeSlot()).capacity(s.getCapacity()).reservedCount(s.getReservedCount()).availableCount(s.getCapacity() - s.getReservedCount()).build(); }
    private String token(Booking b) { return "T" + b.getTokenNumber(); }
    private void publish(Booking b, String status) { publisher.publishFarmerEvent(b.getFarmer().getId(), "/status", "WEATHER_RESCHEDULED", Map.of("bookingId", b.getId(), "status", status, "token", token(b), "bookingDate", b.getBookingDate().toString(), "timeSlot", b.getTimeSlot().toString(), "bookingType", Optional.ofNullable(b.getBookingType()).orElse("NORMAL"))); }
    private BookingResponse map(Booking b) { return BookingResponse.builder().id(b.getId()).farmerId(b.getFarmer().getId()).farmerName(b.getFarmer().getName()).farmerMobileNumber(b.getFarmer().getMobileNumber()).farmerVillage(b.getFarmer().getVillage()).centreId(b.getCentre().getId()).emergencySlotId(b.getEmergencySlotId()).bookingDate(b.getBookingDate()).timeSlot(b.getTimeSlot()).originalDate(b.getOriginalDate()).originalTime(b.getOriginalTime()).produceQuantity(b.getProduceQuantity()).tokenNumber(b.getTokenNumber()).status(b.getStatus()).bookingType(b.getBookingType()).weatherAffected(b.isWeatherAffected()).reschedulingStatus(b.getReschedulingStatus()).weatherReason(b.getWeatherReason()).rescheduledAt(b.getRescheduledAt()).createdAt(b.getCreatedAt()).build(); }
}
