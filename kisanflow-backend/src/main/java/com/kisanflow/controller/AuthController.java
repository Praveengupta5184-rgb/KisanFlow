package com.kisanflow.controller;

import com.kisanflow.dto.KisanFlowDtos.*;
import com.kisanflow.entity.KisanFlowEntities.*;
import com.kisanflow.repository.KisanFlowRepositories.FarmerRepository;
import com.kisanflow.repository.KisanFlowRepositories.UserAuthRepository;
import com.kisanflow.security.SecurityComponents.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

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
    private final FarmerRepository farmerRepository;
    private final UserAuthRepository userAuthRepository;

    /* ────────────────────────────────────────────────────────────────────────
     * POST /api/v1/auth/login
     * Officer and Trader username + password credential login.
     * ──────────────────────────────────────────────────────────────────────── */
    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@Valid @RequestBody AuthLoginRequest r) {
        UserAuth u = userAuthRepository.findByUsername(r.getUsername()).orElse(null);
        if (u == null && isDemoOfficer(r)) {
            u = createDemoOfficer(r.getUsername());
        } else if (u == null && isDemoTrader(r)) {
            u = createDemoTrader();
        }
        if (u == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("status", "ERROR", "message", "Invalid credentials"));
        }
        if ((isDemoOfficer(r) || isDemoTrader(r)) && !encoder.matches(r.getPassword(), u.getPasswordHash())) {
            u.setPasswordHash(encoder.encode(r.getPassword()));
            u = userAuthRepository.save(u);
        }
        if (!encoder.matches(r.getPassword(), u.getPasswordHash())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("status", "ERROR", "message", "Invalid credentials"));
        }
        return buildTokenResponse(u);
    }

    private boolean isDemoOfficer(AuthLoginRequest request) {
        return ("district_manager".equals(request.getUsername()) && "DistrictManager@123".equals(request.getPassword()))
                || ("officer_kapurthala".equals(request.getUsername()) && "KapurthalaOfficer@123".equals(request.getPassword()));
    }

    private boolean isDemoTrader(AuthLoginRequest request) {
        return "demo_trader".equals(request.getUsername()) && "Trader@123".equals(request.getPassword());
    }

    private UserAuth createDemoOfficer(String username) {
        UUID centreId = "officer_kapurthala".equals(username)
                ? UUID.fromString("f47ac10b-58cc-4372-a567-0e02b2c3d479") : null;
        return userAuthRepository.save(UserAuth.builder()
                .username(username)
                .passwordHash(encoder.encode("district_manager".equals(username) ? "DistrictManager@123" : "KapurthalaOfficer@123"))
                .role("district_manager".equals(username) ? Role.DISTRICT_OFFICER : Role.OFFICER)
                .linkedCentreId(centreId)
                .build());
    }

    private final com.kisanflow.repository.KisanFlowRepositories.TraderRepository traderRepository;
    private final com.kisanflow.repository.KisanFlowRepositories.CentreRepository centreRepository;

    private UserAuth createDemoTrader() {
        UUID centreId = UUID.fromString("f47ac10b-58cc-4372-a567-0e02b2c3d479");
        ProcurementCentre centre = centreRepository.findById(centreId).orElse(null);
        Trader t = Trader.builder()
            .name("Demo Trader")
            .mobileNumber("9876543211")
            .licenseNumber("TRD-12345")
            .linkedCentre(centre)
            .build();
        t = traderRepository.save(t);

        return userAuthRepository.save(UserAuth.builder()
                .username("demo_trader")
                .passwordHash(encoder.encode("Trader@123"))
                .role(Role.TRADER)
                .traderId(t.getId())
                .linkedCentreId(centreId)
                .build());
    }

    /* ────────────────────────────────────────────────────────────────────────
     * POST /api/v1/auth/farmer/register
     * Creates a new Farmer row + linked UserAuth row in PostgreSQL.
     * Rejects duplicate mobileNumber registrations.
     * ──────────────────────────────────────────────────────────────────────── */
    @PostMapping("/farmer/register")
    public ResponseEntity<Map<String, Object>> registerFarmer(@Valid @RequestBody FarmerRequest request) {

        // 1. Check if phone number already exists in farmers table
        Optional<Farmer> existingFarmer = farmerRepository.findByMobileNumber(request.getMobileNumber());
        if (existingFarmer.isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                    "status", "ERROR",
                    "message", "Mobile number already registered. Please login with OTP."
            ));
        }

        // 2. Also check if a UserAuth entry already references this mobile
        Optional<UserAuth> existingAuth = userAuthRepository.findByLinkedFarmerMobileNumber(request.getMobileNumber());
        if (existingAuth.isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                    "status", "ERROR",
                    "message", "An account for this mobile number already exists."
            ));
        }

        // 3. Build and persist the Farmer entity
        Farmer farmer = Farmer.builder()
                .name(request.getName())
                .mobileNumber(request.getMobileNumber())
                .village(request.getVillage())
                .preferredLanguage(request.getPreferredLanguage())
                .cropType(request.getCropType())
                .build();

        farmer = farmerRepository.save(farmer);

        // 4. Create a corresponding UserAuth entry with role FARMER
        //    Username is the mobile number; password hash is a placeholder
        //    since farmers authenticate via OTP, not password.
        UserAuth userAuth = UserAuth.builder()
                .username(request.getMobileNumber())
                .passwordHash(encoder.encode("otp-only-" + request.getMobileNumber()))
                .role(Role.FARMER)
                .linkedFarmer(farmer)
                .build();

        userAuth = userAuthRepository.save(userAuth);

        // 5. Build the 201 Created response
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

    /* ────────────────────────────────────────────────────────────────────────
     * POST /api/v1/auth/otp/send
     * Simulates OTP code generation safely via in-memory OtpStore.
     * No external SMS provider dependency (Twilio removed).
     * ──────────────────────────────────────────────────────────────────────── */
    @PostMapping("/otp/send")
    public ResponseEntity<Map<String, Object>> sendOtp(@RequestBody Map<String, Object> payload) {

        String mobileNumber = payload != null && payload.get("mobileNumber") != null
                ? String.valueOf(payload.get("mobileNumber"))
                : "";

        // Validate mobile number format (10-15 digits)
        if (!mobileNumber.matches("^[+]?[0-9]{10,15}$")) {
            return ResponseEntity.badRequest().body(Map.of(
                    "status", "ERROR",
                    "message", "Invalid mobile number format. Please provide a 10-digit number."
            ));
        }

        // Generate OTP via OtpStore (in-memory, no external dependency)
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

    /* ────────────────────────────────────────────────────────────────────────
     * POST /api/v1/auth/otp/verify
     * Verifies OTP and issues a real signed JWT token.
     * Accepts the generated OTP code OR the static hackathon bypass "123456".
     * ──────────────────────────────────────────────────────────────────────── */
    @PostMapping("/otp/verify")
    public ResponseEntity<Map<String, Object>> verifyOtp(@RequestBody Map<String, Object> payload) {

        if (payload == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("status", "ERROR", "message", "Request body is required"));
        }

        // Extract mobile number
        String mobileNumber = payload.get("mobileNumber") != null
                ? String.valueOf(payload.get("mobileNumber"))
                : "";

        // Extract OTP code from multiple possible field names for frontend compatibility
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

        // Validate OTP: try OtpStore first, then fall back to hackathon static code
        boolean otpValid = otps.verify(mobileNumber, otpCode);
        boolean hackathonBypass = "123456".equals(otpCode);

        if (!otpValid && !hackathonBypass) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "status", "ERROR",
                    "message", "Invalid or expired OTP code"
            ));
        }

        // Look up the UserAuth record linked to this mobile number
        Optional<UserAuth> userAuthOpt = userAuthRepository.findByLinkedFarmerMobileNumber(mobileNumber);

        if (userAuthOpt.isEmpty()) {
            if (hackathonBypass) {
                Farmer demoFarmer = farmerRepository.save(Farmer.builder()
                        .name("Hackathon Demo Farmer")
                        .mobileNumber(mobileNumber)
                        .village("Demo Village")
                        .preferredLanguage("hi")
                        .cropType("Wheat")
                        .build());
                UserAuth demoAuth = userAuthRepository.save(UserAuth.builder()
                        .username(mobileNumber)
                        .passwordHash(encoder.encode("otp-only-" + mobileNumber))
                        .role(Role.FARMER)
                        .linkedFarmer(demoFarmer)
                        .build());
                return buildTokenResponse(demoAuth);
            }
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                    "status", "ERROR",
                    "message", "No registered account found for this mobile number. Please register first."
            ));
        }

        UserAuth userAuth = userAuthOpt.get();

        // Issue real signed JWT via JwtUtil (contains sub, role, farmerId, type, exp)
        return buildTokenResponse(userAuth);
    }

    /* ────────────────────────────────────────────────────────────────────────
     * POST /api/v1/auth/refresh
     * Exchanges a valid refresh token for a new access + refresh pair.
     * ──────────────────────────────────────────────────────────────────────── */
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

    /* ────────────────────────────────────────────────────────────────────────
     * POST /api/v1/auth/logout
     * Blacklists the current access token.
     * ──────────────────────────────────────────────────────────────────────── */
    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(@RequestHeader(value = "Authorization", required = false) String h) {
        if (h != null && h.startsWith("Bearer ")) {
            filter.blacklist(h.substring(7));
        }
    }

    /* ────────────────────────────────────────────────────────────────────────
     * Private helper: Build structured JWT response including farmer profile.
     * ──────────────────────────────────────────────────────────────────────── */
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

        // Include farmer profile data if this is a FARMER user
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
