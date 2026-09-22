package com.kisanflow.dto;

import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;

public final class KisanFlowDtos {
    private KisanFlowDtos() {}
    @Data @NoArgsConstructor @AllArgsConstructor @Builder public static class FarmerRequest { @NotBlank private String name; @Pattern(regexp="^[+]?[0-9]{10,15}$") private String mobileNumber; @NotBlank private String village; private String cropType; @NotBlank private String preferredLanguage; }
    @Data @NoArgsConstructor @AllArgsConstructor @Builder public static class FarmerResponse { private UUID id; private String name, mobileNumber, village, cropType, preferredLanguage; }
    @Data @NoArgsConstructor @AllArgsConstructor @Builder public static class CentreRequest { @NotBlank private String name, address; @NotNull private BigDecimal latitude, longitude; @Min(1) private Integer capacity; @Min(0) private Integer staffCount, currentLoad; @DecimalMin("0") private BigDecimal processingSpeed; private String status; }
    @Data @NoArgsConstructor @AllArgsConstructor @Builder public static class CentreResponse { private UUID id; private String name, address, status; private BigDecimal latitude, longitude, processingSpeed; private Integer capacity, staffCount, currentLoad; }
    @Data @NoArgsConstructor @AllArgsConstructor @Builder public static class CropPriceRequest { @NotBlank private String cropType; @NotNull @DecimalMin("0.01") private BigDecimal price; }
    @Data @NoArgsConstructor @AllArgsConstructor @Builder public static class CropPriceResponse { private UUID id, centreId; private String cropType, updatedBy; private BigDecimal price; private OffsetDateTime updatedAt; }
    @Data @NoArgsConstructor @AllArgsConstructor @Builder public static class BookingRequest { @NotNull private UUID farmerId, centreId; @NotNull @FutureOrPresent private LocalDate bookingDate; @NotNull private LocalTime timeSlot; @NotNull @DecimalMin("0.001") private BigDecimal produceQuantity; }
    @Data @NoArgsConstructor @AllArgsConstructor @Builder public static class BookingResponse { private UUID id, farmerId, centreId, emergencySlotId; private String farmerName, farmerMobileNumber, farmerVillage, bookingType, reschedulingStatus, weatherReason, status; private LocalDate bookingDate, originalDate; private LocalTime timeSlot, originalTime; private java.math.BigDecimal produceQuantity; private Integer tokenNumber; private boolean weatherAffected; private OffsetDateTime rescheduledAt, createdAt; private Integer currentCounter, nextCounter; private String nextProcess, officerInstruction; private String qrId; private Integer qrVersion; private String entryStatus; private String exitStatus; private Boolean insideMandi; private OffsetDateTime entryTime; private OffsetDateTime exitTime; }
    @Data @NoArgsConstructor @AllArgsConstructor @Builder public static class WeatherAlertResponse { private UUID bookingId, centreId; private String token, centreName, reason; private LocalDate bookingDate; private LocalTime timeSlot; private boolean affected; }
    @Data @NoArgsConstructor @AllArgsConstructor @Builder public static class EmergencySlotResponse { private UUID id, centreId; private LocalDate slotDate; private LocalTime timeSlot; private Integer capacity, reservedCount, availableCount; }
    @Data @NoArgsConstructor @AllArgsConstructor @Builder public static class StatusUpdateRequest { @NotBlank private String stage; private Integer currentCounter, nextCounter; private String nextProcess, instruction, officerNote; }
    @Data @NoArgsConstructor @AllArgsConstructor @Builder public static class StatusLogResponse { private String stage; private OffsetDateTime timestamp; }
    @Data @NoArgsConstructor @AllArgsConstructor @Builder public static class QueueResponse { private UUID centreId; private String currentServingToken; private List<String> nextUpTokens; private Integer currentToken, processedCount, pendingCount, activeCounters, activeFarmerCount, totalActiveTokens, estimatedWaitMinutes; private OffsetDateTime timestamp; }
    @Data @NoArgsConstructor @AllArgsConstructor @Builder public static class PersonalQueueResponse { private UUID bookingId, centreId; private String token, status, currentServingToken; private Integer queuePosition, farmersAhead, totalActiveFarmers, estimatedWaitMinutes; private OffsetDateTime updatedAt; private Integer currentCounter, nextCounter; private String nextProcess, officerInstruction; }
    @Data @NoArgsConstructor @AllArgsConstructor @Builder public static class PaymentRequest { @NotNull private UUID bookingId; @NotNull @DecimalMin("0") private BigDecimal amount; @NotBlank private String status; @NotNull private LocalDate expectedDate; private LocalDate actualDate; }
    @Data @NoArgsConstructor @AllArgsConstructor @Builder public static class PaymentResponse { private UUID id, bookingId; private BigDecimal amount; private String status; private LocalDate expectedDate, actualDate; private Boolean delayFlag; }
    @Data @NoArgsConstructor @AllArgsConstructor @Builder public static class CentreStatsResponse { private UUID centreId; private BigDecimal avgQueueLength, avgProcessingSpeed, staffEfficiencyScore; private String peakHours, bottleneckStage; private OffsetDateTime lastUpdated; }
    @Data @NoArgsConstructor @AllArgsConstructor @Builder public static class AlertRequest { @NotNull private UUID centreId; @NotBlank private String alertType, severity, message; private String suggestedAction; }
    @Data @NoArgsConstructor @AllArgsConstructor @Builder public static class AlertResponse { private UUID id, centreId; private String alertType, severity, message, suggestedAction, status; private OffsetDateTime createdAt; }
    @Data @NoArgsConstructor @AllArgsConstructor @Builder public static class AnomalyRequest { private UUID relatedBookingId; @NotBlank private String flagType, description, riskLevel; }
    @Data @NoArgsConstructor @AllArgsConstructor @Builder public static class NotificationRequest { @NotNull private UUID farmerId; @NotBlank private String channel, message; }
    @Data @NoArgsConstructor @AllArgsConstructor @Builder public static class AiRequest { @NotNull private Map<String, Object> payload; }
    @Data @NoArgsConstructor @AllArgsConstructor @Builder public static class AuthLoginRequest { @NotBlank private String username, password; }
    @Data @NoArgsConstructor @AllArgsConstructor @Builder public static class OtpRequest { @Pattern(regexp="^[+]?[0-9]{10,15}$") private String mobileNumber; }
    @Data @NoArgsConstructor @AllArgsConstructor @Builder public static class OtpVerifyRequest { @Pattern(regexp="^[+]?[0-9]{10,15}$") private String mobileNumber; @Pattern(regexp="^[0-9]{6}$") private String otp; }
    @Data @NoArgsConstructor @AllArgsConstructor @Builder public static class RefreshRequest { @NotBlank private String refreshToken; }
    @Data @NoArgsConstructor @AllArgsConstructor @Builder public static class TokenResponse { private String accessToken, refreshToken, tokenType; private long expiresIn; private String role; }
    /** Request body for QR scan endpoint. */
    @Data @NoArgsConstructor @AllArgsConstructor @Builder public static class QrScanRequest { @NotBlank private String qrId; }
    /** Response from a QR scan — includes event type, farmer info, and live occupancy. */
    @Data @NoArgsConstructor @AllArgsConstructor @Builder public static class QrScanResponse { private String event; private String farmerName; private String token; private String mandiName; private OffsetDateTime entryTime; private OffsetDateTime exitTime; private String entryStatus; private long currentOccupancy; private String message; }
    /** Live mandi physical occupancy for a centre. */
    @Data @NoArgsConstructor @AllArgsConstructor @Builder public static class OccupancyResponse { private UUID centreId; private String centreName; private long insideCount; private Integer capacity; private long available; }
    @Data @NoArgsConstructor @AllArgsConstructor @Builder public static class TraderResponse { private UUID id; private String name, mobileNumber, licenseNumber; private UUID linkedCentreId; }
    @Data @NoArgsConstructor @AllArgsConstructor @Builder public static class LotResponse { private UUID id, bookingId, centreId; private String lotNumber; private BigDecimal actualWeight, basePrice, highestBidAmount; private UUID highestBidderId; private String qualityGrade, status; private OffsetDateTime createdAt, updatedAt; }
    @Data @NoArgsConstructor @AllArgsConstructor @Builder public static class BidRequest { @NotNull private UUID traderId; @NotNull @DecimalMin("0.01") private BigDecimal amount; }
    @Data @NoArgsConstructor @AllArgsConstructor @Builder public static class BidResponse { private UUID id, lotId, traderId; private BigDecimal amount; private String status; private OffsetDateTime createdAt; }
}
