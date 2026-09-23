package com.kisanflow.controller;

import com.kisanflow.demo.InMemoryDemoStore;
import com.kisanflow.dto.KisanFlowDtos.*;
import com.kisanflow.entity.KisanFlowEntities.*;
import com.kisanflow.security.SecurityComponents.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/v1/auth")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class AuthController {

    private final Users users;
    private final JwtUtil jwt;
    private final OtpStore otps;
    private final PasswordEncoder encoder;
    private final JwtFilter filter;
    private final InMemoryDemoStore store;

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@Valid @RequestBody AuthLoginRequest r) {
        UserAuth u = store.getUserByUsername(r.getUsername());
        if (u == null || !encoder.matches(r.getPassword(), u.getPasswordHash())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("status", "ERROR", "message", "Invalid credentials"));
        }
        return buildTokenResponse(u);
    }

    @PostMapping("/farmer/register")
    public ResponseEntity<Map<String, Object>> registerFarmer(@Valid @RequestBody FarmerRequest request) {

        Optional<Farmer> existingFarmer = store.getAllFarmers().stream().filter(f -> request.getMobileNumber().equals(f.getMobileNumber())).findFirst();
        if (existingFarmer.isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                    "status", "ERROR",
                    "message", "Mobile number already registered. Please login with OTP."
            ));
        }

        Optional<UserAuth> existingAuth = store.getAllUsers().stream().filter(u -> u.getLinkedFarmer() != null && request.getMobileNumber().equals(u.getLinkedFarmer().getMobileNumber())).findFirst();
        if (existingAuth.isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                    "status", "ERROR",
                    "message", "An account for this mobile number already exists."
            ));
        }

        Farmer farmer = Farmer.builder()
                .id(UUID.randomUUID())
                .name(request.getName())
                .mobileNumber(request.getMobileNumber())
                .village(request.getVillage())
                .preferredLanguage(request.getPreferredLanguage())
                .cropType(request.getCropType())
                .createdAt(OffsetDateTime.now())
                .build();
        store.saveFarmer(farmer);

        UserAuth userAuth = UserAuth.builder()
                .id(UUID.randomUUID())
                .username(request.getMobileNumber())
                .passwordHash(encoder.encode("otp-only-" + request.getMobileNumber()))
                .role(Role.FARMER)
                .linkedFarmer(farmer)
                .createdAt(OffsetDateTime.now())
                .updatedAt(OffsetDateTime.now())
                .build();
        store.saveUser(userAuth);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("status", "SUCCESS");
        response.put("message", "Farmer registered successfully");
        response.put("farmerId", farmer.getId().toString());
        response.put("userId", userAuth.getId().toString());
        response.put("farmer", Map.of(
                "id", farmer.getId().toString(),
                "name", farmer.getName(),
                "mobileNumber", farmer.getMobileNumber(),
                "village", farmer.getVillage(),
                "preferredLanguage", farmer.getPreferredLanguage(),
                "cropType", farmer.getCropType() != null ? farmer.getCropType() : ""
        ));

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/otp/send")
    public ResponseEntity<Map<String, Object>> sendOtp(@RequestBody Map<String, Object> payload) {
        String mobileNumber = payload != null && payload.get("mobileNumber") != null
                ? String.valueOf(payload.get("mobileNumber"))
                : "";

        if (!mobileNumber.matches("^[+]?[0-9]{10,15}$")) {
            return ResponseEntity.badRequest().body(Map.of(
                    "status", "ERROR",
                    "message", "Invalid mobile number format. Please provide a 10-digit number."
            ));
        }

        String generatedCode;
        try {
            generatedCode = otps.send(mobileNumber);
        } catch (IllegalStateException cooldownException) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(Map.of(
                    "status", "COOLDOWN",
                    "message", "OTP resend cooldown is active. Please wait 60 seconds."
            ));
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("status", "SUCCESS");
        response.put("message", "OTP simulation bypass active");
        response.put("developmentOtp", generatedCode);
        response.put("hackathonBypassCode", "123456");

        return ResponseEntity.ok(response);
    }

    @PostMapping("/otp/verify")
    public ResponseEntity<Map<String, Object>> verifyOtp(@RequestBody Map<String, Object> payload) {
        if (payload == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("status", "ERROR", "message", "Request body is required"));
        }

        String mobileNumber = payload.get("mobileNumber") != null
                ? String.valueOf(payload.get("mobileNumber"))
                : "";

        String otpCode = "";
        for (String field : List.of("otp", "otpCode", "code")) {
            if (payload.get(field) != null) {
                otpCode = String.valueOf(payload.get(field));
                break;
            }
        }

        if (mobileNumber.isBlank() || otpCode.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "status", "ERROR",
                    "message", "Both mobileNumber and otp are required"
            ));
        }

        String purpose = payload.get("purpose") != null ? String.valueOf(payload.get("purpose")) : "login";

        boolean otpValid = otps.verify(mobileNumber, otpCode);
        boolean hackathonBypass = "123456".equals(otpCode);

        if (!otpValid && !hackathonBypass) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "status", "ERROR",
                    "message", "Invalid or expired OTP code"
            ));
        }

        Optional<UserAuth> userAuthOpt = store.getAllUsers().stream().filter(u -> u.getLinkedFarmer() != null && mobileNumber.equals(u.getLinkedFarmer().getMobileNumber())).findFirst();

        if ("register".equalsIgnoreCase(purpose)) {
            if (userAuthOpt.isPresent()) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                        "status", "ERROR",
                        "message", "An account for this mobile number already exists. Please login."
                ));
            }
            // Registration OTP is valid, but we don't return a token yet because the user hasn't completed the form.
            return ResponseEntity.ok(Map.of(
                    "status", "SUCCESS",
                    "message", "OTP verified successfully. You may proceed with registration."
            ));
        }

        if (userAuthOpt.isEmpty()) {
            if (hackathonBypass) {
                Farmer demoFarmer = Farmer.builder()
                        .id(UUID.randomUUID())
                        .name("Hackathon Demo Farmer")
                        .mobileNumber(mobileNumber)
                        .village("Demo Village")
                        .preferredLanguage("hi")
                        .cropType("Wheat")
                        .createdAt(OffsetDateTime.now())
                        .build();
                store.saveFarmer(demoFarmer);
                UserAuth demoAuth = UserAuth.builder()
                        .id(UUID.randomUUID())
                        .username(mobileNumber)
                        .passwordHash(encoder.encode("otp-only-" + mobileNumber))
                        .role(Role.FARMER)
                        .linkedFarmer(demoFarmer)
                        .createdAt(OffsetDateTime.now())
                        .updatedAt(OffsetDateTime.now())
                        .build();
                store.saveUser(demoAuth);
                return buildTokenResponse(demoAuth);
            }
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                    "status", "ERROR",
                    "message", "No registered account found for this mobile number. Please register first."
            ));
        }

        UserAuth userAuth = userAuthOpt.get();
        return buildTokenResponse(userAuth);
    }

    @PostMapping("/refresh")
    public ResponseEntity<Map<String, Object>> refresh(@Valid @RequestBody RefreshRequest r) {
        try {
            var claims = jwt.parse(r.getRefreshToken());
            if (!"refresh".equals(claims.get("type"))) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("status", "ERROR", "message", "Refresh token required"));
            }
            UserAuth u = users.byId(UUID.fromString(claims.getSubject()));
            return buildTokenResponse(u);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("status", "ERROR", "message", "Invalid or expired refresh token"));
        }
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(@RequestHeader(value = "Authorization", required = false) String h) {
        if (h != null && h.startsWith("Bearer ")) {
            filter.blacklist(h.substring(7));
        }
    }

    private ResponseEntity<Map<String, Object>> buildTokenResponse(UserAuth u) {
        String accessToken = jwt.access(u);
        String refreshToken = jwt.refresh(u);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("status", "SUCCESS");
        response.put("token", accessToken);
        response.put("accessToken", accessToken);
        response.put("refreshToken", refreshToken);
        response.put("tokenType", "Bearer");
        response.put("expiresIn", jwt.accessSeconds());
        response.put("role", u.getRole().name());
        response.put("userId", u.getId().toString());

        if (u.getLinkedFarmer() != null) {
            Farmer f = u.getLinkedFarmer();
            response.put("farmerId", f.getId().toString());
            response.put("farmer", Map.of(
                    "id", f.getId().toString(),
                    "name", f.getName() != null ? f.getName() : "",
                    "mobileNumber", f.getMobileNumber() != null ? f.getMobileNumber() : "",
                    "village", f.getVillage() != null ? f.getVillage() : "",
                    "preferredLanguage", f.getPreferredLanguage() != null ? f.getPreferredLanguage() : "",
                    "cropType", f.getCropType() != null ? f.getCropType() : ""
            ));
        }
        if (u.getRole() == Role.TRADER && u.getTraderId() != null) {
            response.put("traderId", u.getTraderId().toString());
            if (u.getLinkedCentreId() != null) {
                response.put("centreId", u.getLinkedCentreId().toString());
            }
        }

        return ResponseEntity.ok(response);
    }
}
