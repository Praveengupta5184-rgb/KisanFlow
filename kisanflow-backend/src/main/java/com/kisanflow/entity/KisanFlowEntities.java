package com.kisanflow.entity;

import lombok.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;

/** Clean POJO mappings for the DB-Free Prototype */
public final class KisanFlowEntities {
    private KisanFlowEntities() {}
    public enum Role { FARMER, OFFICER, DISTRICT_OFFICER, ADMIN, TRADER }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Farmer {
        private UUID id;
        private String name; 
        private String mobileNumber;
        private String village; 
        private String preferredLanguage;
        private String cropType; 
        private OffsetDateTime createdAt;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ProcurementCentre {
        private UUID id;
        private String name; private BigDecimal latitude; private BigDecimal longitude; private String address;
        private String district;
        private String state;
        private Integer capacity; 
        private Integer staffCount;
        private BigDecimal processingSpeed; 
        private Integer currentLoad;
        private String status; 
        private OffsetDateTime createdAt;
        private OffsetDateTime updatedAt;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class CropPrice {
        private UUID id;
        private ProcurementCentre centre;
        private String cropType;
        private BigDecimal price;
        private String updatedBy;
        private OffsetDateTime updatedAt;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class UserAuth {
        private UUID id;
        private UUID externalAuthUserId;
        private Role role;
        private Farmer linkedFarmer;
        private UUID officerId;
        private UUID traderId;
        private String username;
        private String passwordHash;
        private UUID linkedCentreId;
        private OffsetDateTime createdAt;
        private OffsetDateTime updatedAt;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Booking {
        private UUID id;
        private Farmer farmer;
        private ProcurementCentre centre;
        private LocalDate bookingDate; 
        private LocalTime timeSlot;
        private BigDecimal produceQuantity; 
        private Integer tokenNumber;
        private LocalDate originalDate; 
        private LocalTime originalTime;
        private String bookingType; 
        private boolean weatherAffected;
        private String reschedulingStatus; 
        private UUID emergencySlotId;
        private OffsetDateTime rescheduledAt; 
        private String weatherReason;
        private Integer currentCounter; 
        private Integer nextCounter;
        private String nextProcess; 
        private String officerInstruction;
        private String qrId;
        @Builder.Default private Integer qrVersion = 1;
        private String status; 
        private OffsetDateTime createdAt;
        private OffsetDateTime updatedAt;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class EmergencySlot {
        private UUID id;
        private ProcurementCentre centre;
        private LocalDate slotDate;
        private LocalTime timeSlot;
        private Integer capacity;
        private Integer reservedCount;
        private OffsetDateTime createdAt;
        private OffsetDateTime updatedAt;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ProcurementStatusLog {
        private UUID id;
        private Booking booking;
        private String stage; private OffsetDateTime timestamp;
        private Integer currentCounter; 
        private Integer nextCounter;
        private String nextProcess; 
        private String officerInstruction;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Payment {
        private UUID id;
        private Booking booking;
        private Trader trader;
        private Lot lot;
        private UUID bidId;
        private BigDecimal amount; 
        private String status; 
        private String paymentMethod;
        private String paymentType;
        private String transactionId;
        private String offlineReference;
        private Boolean farmerConfirmation;
        private String remarks;
        private String proofUrl;
        
        private LocalDate expectedDate;
        private LocalDate actualDate; 
        private Boolean delayFlag;
        
        private OffsetDateTime initiatedAt;
        private OffsetDateTime processedAt;
        private OffsetDateTime farmerConfirmedAt;
        private OffsetDateTime officerVerifiedAt;
        private OffsetDateTime createdAt; 
        private OffsetDateTime updatedAt;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class QueueSnapshot {
        private UUID id;
        private ProcurementCentre centre;
        private OffsetDateTime timestamp; 
        private Integer currentToken;
        private Integer processedCount; 
        private Integer pendingCount;
        private Integer activeCounters;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class CentreStats {
        private UUID id;
        private ProcurementCentre centre;
        private BigDecimal avgQueueLength; 
        private String peakHours;
        private BigDecimal avgProcessingSpeed; 
        private String bottleneckStage;
        private BigDecimal staffEfficiencyScore; 
        private OffsetDateTime lastUpdated;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class CrisisAlert {
        private UUID id;
        private ProcurementCentre centre;
        private String alertType; private String severity; private String message;
        private String suggestedAction; private String status;
        private OffsetDateTime createdAt; 
        private OffsetDateTime resolvedAt;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class AnomalyFlag {
        private UUID id;
        private Booking relatedBooking;
        private String flagType; private String description; 
        private String riskLevel;
        private String status; 
        private OffsetDateTime createdAt;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Notification {
        private UUID id;
        private Farmer farmer;
        private String channel; private String message; 
        private OffsetDateTime sentAt;
        private String status; 
        private OffsetDateTime createdAt;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class CropQualityCheck {
        private UUID id;
        private Booking booking;
        private String imageUrl; 
        private String aiRiskResult;
        private String finalVerifiedResult; 
        private UUID verifiedBy;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class MandiEntryExit {
        private UUID id;
        private Booking booking;
        private Farmer farmer;
        private ProcurementCentre centre;
        private String qrId;
        private OffsetDateTime entryTime;
        private OffsetDateTime exitTime;
        @Builder.Default private Boolean insideMandi = false;
        @Builder.Default private String entryStatus = "PENDING";
        @Builder.Default private String exitStatus  = "NOT_EXITED";
        private OffsetDateTime createdAt;
        private OffsetDateTime updatedAt;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class TokenSequenceId implements java.io.Serializable {
        private UUID centre;
        private LocalDate bookingDate;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class TokenSequence {
        private ProcurementCentre centre;
        private LocalDate bookingDate;
        @Builder.Default private Integer lastToken = 0;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Trader {
        private UUID id;
        private String name;
        private String mobileNumber;
        private String licenseNumber;
        private ProcurementCentre linkedCentre;
        private OffsetDateTime createdAt;
        private OffsetDateTime updatedAt;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Lot {
        private UUID id;
        private Booking booking;
        private ProcurementCentre centre;
        private BigDecimal actualWeight;
        private String qualityGrade;
        @Builder.Default private String status = "open";
        private BigDecimal basePrice;
        private UUID acceptedBidId;
        private UUID winningTraderId;
        private OffsetDateTime acceptedAt;
        private OffsetDateTime auctionExpiresAt;
        private OffsetDateTime createdAt;
        private OffsetDateTime updatedAt;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Bid {
        private UUID id;
        private Lot lot;
        private Trader trader;
        private BigDecimal amount;
        @Builder.Default private String status = "placed";
        private OffsetDateTime createdAt;
    }
}
