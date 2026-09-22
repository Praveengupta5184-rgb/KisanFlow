package com.kisanflow.controller;

import com.kisanflow.entity.KisanFlowEntities.Booking;
import com.kisanflow.entity.KisanFlowEntities.Farmer;
import com.kisanflow.repository.KisanFlowRepositories.BookingRepository;
import com.kisanflow.repository.KisanFlowRepositories.FarmerRepository;
import com.kisanflow.service.IvrSessionService;
import com.kisanflow.service.IvrSessionService.IvrSession;
import com.kisanflow.service.MandiDataService;
import com.kisanflow.realtime.RealtimeQueueModule.QueueService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@RestController
@RequestMapping("/api/v1/ivr")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class IvrVoiceController {

    private final BookingRepository bookings;
    private final FarmerRepository farmers;
    private final IvrSessionService sessionService;
    private final MandiDataService mandiDataService;
    private final QueueService queueService;

    @PostMapping("/query")
    public ResponseEntity<Map<String, String>> simulateIvr(@RequestBody Map<String, Object> payload) {
        String callerId = String.valueOf(payload.getOrDefault("callerId", "unknown"));
        String digits = String.valueOf(payload.getOrDefault("digits", ""));

        IvrSession session = sessionService.getOrCreateSession(callerId);
        
        Optional<Farmer> farmerOpt = farmers.findByMobileNumber(callerId);
        String responseText = "";

        if (farmerOpt.isEmpty()) {
            responseText = "Welcome to KisanFlow. We could not find a registered farmer with this number. Please register using our app.";
            sessionService.endSession(callerId);
            return ResponseEntity.ok(Map.of("response", responseText, "action", "hangup"));
        }

        Farmer farmer = farmerOpt.get();

        switch (session.getCurrentState()) {
            case "MAIN_MENU":
                if ("1".equals(digits)) {
                    // Token Status
                    Optional<Booking> activeBookingOpt = bookings.findByFarmerIdAndStatusIn(
                            farmer.getId(),
                            List.of("booked", "token_generated", "arrived", "weighing", "quality_check", "procurement", "payment_processing")
                    ).stream().findFirst();

                    if (activeBookingOpt.isPresent()) {
                        Booking b = activeBookingOpt.get();
                        String etaMsg = "";
                        try {
                            var personalQueue = queueService.personal(b.getId());
                            if (personalQueue.getEstimatedWaitMinutes() > 0) {
                                etaMsg = " Your expected wait time is " + personalQueue.getEstimatedWaitMinutes() + " minutes.";
                            }
                        } catch (Exception e) {
                            log.warn("Could not fetch ETA for IVR for booking {}", b.getId(), e);
                        }
                        responseText = "Your active token number is KF-" + b.getTokenNumber() + ". Current status is " + b.getStatus().replace("_", " ") + "." + etaMsg + " Main menu, press 9.";
                    } else {
                        responseText = "You do not have any active token. To book a new token, press 2. For main menu, press 9.";
                    }
                    sessionService.updateState(callerId, "AWAITING_INPUT");
                } else if ("2".equals(digits)) {
                    // Mandi Prices
                    try {
                        var rate = mandiDataService.getLiveMspRate(farmer.getCropType(), "Punjab");
                        responseText = "The live MSP rate for " + farmer.getCropType() + " is Rupees " + rate + " per quintal. For main menu, press 9.";
                    } catch (Exception e) {
                        responseText = "Mandi rates are currently unavailable. For main menu, press 9.";
                    }
                    sessionService.updateState(callerId, "AWAITING_INPUT");
                } else {
                    responseText = "Welcome to KisanFlow. Press 1 for Token Status. Press 2 for live Mandi Prices. Press 9 to repeat.";
                }
                break;
            case "AWAITING_INPUT":
                if ("9".equals(digits)) {
                    sessionService.updateState(callerId, "MAIN_MENU");
                    responseText = "Main Menu. Press 1 for Token Status. Press 2 for live Mandi Prices.";
                } else {
                    responseText = "Invalid input. Press 9 for main menu.";
                }
                break;
            default:
                sessionService.updateState(callerId, "MAIN_MENU");
                responseText = "Main Menu. Press 1 for Token Status. Press 2 for live Mandi Prices.";
                break;
        }

        log.info("IVR State: caller={}, digits={}, newState={}, response={}", callerId, digits, session.getCurrentState(), responseText);
        return ResponseEntity.ok(Map.of("response", responseText, "action", "gather"));
    }
}
