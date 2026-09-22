package com.kisanflow.security;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class RealOtpService {

    private final SecureRandom secureRandom = new SecureRandom();

    // 5 minutes Time-to-Live (TTL) in seconds
    private static final long OTP_TTL_SECONDS = 300; 

    // Internal In-Memory State Store: Key = Normalized Phone Number, Value = OtpRecord
    private final Map<String, OtpRecord> otpStore = new ConcurrentHashMap<>();

    public record OtpRecord(String code, Instant expiresAt) {}

    /**
     * Generates a 6-digit secure numeric OTP, saves to in-memory store with 5-min TTL.
     * In DEMO mode, no actual SMS is sent. The OTP is returned for display in the UI.
     *
     * @param mobileNumber Raw or formatted mobile number of the recipient.
     * @return The generated 6-digit OTP code.
     */
    public String sendOtp(String mobileNumber) {
        if (mobileNumber == null || mobileNumber.isBlank()) {
            throw new IllegalArgumentException("Mobile number cannot be null or empty.");
        }

        String normalizedNumber = normalizeIndianPhoneNumber(mobileNumber);

        // Generate cryptographically strong 6-digit OTP code (100000 - 999999)
        int otpInt = 100000 + secureRandom.nextInt(900000);
        String otpCode = String.valueOf(otpInt);

        Instant expiresAt = Instant.now().plusSeconds(OTP_TTL_SECONDS);
        otpStore.put(normalizedNumber, new OtpRecord(otpCode, expiresAt));

        log.info("Demo OTP generated successfully for {}: {}", normalizedNumber, otpCode);

        return otpCode;
    }

    /**
     * Verifies the OTP code supplied against the memory store.
     * Automatically invalidates/purges the token upon successful verification (single-use).
     *
     * @param mobileNumber The mobile number to check.
     * @param inputCode The user provided 6-digit OTP string.
     * @return True if valid and unexpired; false otherwise.
     */
    public boolean verifyOtp(String mobileNumber, String inputCode) {
        if (mobileNumber == null || inputCode == null || inputCode.isBlank()) {
            return false;
        }

        String normalizedNumber = normalizeIndianPhoneNumber(mobileNumber);
        OtpRecord record = otpStore.get(normalizedNumber);

        if (record == null) {
            log.warn("No active OTP found for {}", normalizedNumber);
            return false;
        }

        if (Instant.now().isAfter(record.expiresAt())) {
            log.warn("OTP expired for {}", normalizedNumber);
            otpStore.remove(normalizedNumber);
            return false;
        }

        if (record.code().equals(inputCode.trim())) {
            // Enforce single-use validation rule
            otpStore.remove(normalizedNumber);
            log.info("OTP verification successful for {}", normalizedNumber);
            return true;
        }

        log.warn("Invalid OTP entered for {}", normalizedNumber);
        return false;
    }

    /**
     * Normalizes Indian mobile numbers to standard E.164 format (+91XXXXXXXXXX).
     */
    private String normalizeIndianPhoneNumber(String number) {
        String cleaned = number.replaceAll("[^0-9+]", "");
        if (cleaned.startsWith("+91") && cleaned.length() == 13) {
            return cleaned;
        }
        if (cleaned.startsWith("91") && cleaned.length() == 12) {
            return "+" + cleaned;
        }
        if (cleaned.startsWith("0") && cleaned.length() == 11) {
            return "+91" + cleaned.substring(1);
        }
        if (cleaned.length() == 10) {
            return "+91" + cleaned;
        }
        return cleaned.startsWith("+") ? cleaned : "+" + cleaned;
    }
}
