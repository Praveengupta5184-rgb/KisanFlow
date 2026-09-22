package com.kisanflow.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;

/** JPA mappings for the PostgreSQL DDL in ../kisanflow-database.sql. */
public final class KisanFlowEntities {
    private KisanFlowEntities() {}
    public enum Role { FARMER, OFFICER, DISTRICT_OFFICER, ADMIN, TRADER }

    @Entity(name = "Farmer") @Table(name = "farmers") @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Farmer {
        @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
        private String name; @Column(name = "mobileNumber") private String mobileNumber;
        private String village; @Column(name = "preferredLanguage") private String preferredLanguage;
        @Column(name = "cropType") private String cropType; @CreationTimestamp @Column(name = "createdAt") private OffsetDateTime createdAt;
    }

    @Entity(name = "ProcurementCentre") @Table(name = "procurementCentres") @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ProcurementCentre {
        @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
        private String name; private BigDecimal latitude; private BigDecimal longitude; private String address;
        private Integer capacity; @Column(name = "staffCount") private Integer staffCount;
        @Column(name = "processingSpeed") private BigDecimal processingSpeed; @Column(name = "currentLoad") private Integer currentLoad;
        private String status; @CreationTimestamp @Column(name = "createdAt") private OffsetDateTime createdAt;
        @UpdateTimestamp @Column(name = "updatedAt") private OffsetDateTime updatedAt;
    }

    @Entity(name = "CropPrice") @Table(name = "cropPrices", uniqueConstraints = @UniqueConstraint(columnNames = {"centreId", "cropType"})) @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class CropPrice {
        @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
        @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "centreId", nullable = false) private ProcurementCentre centre;
        @Column(name = "cropType", nullable = false) private String cropType;
        @Column(nullable = false, precision = 12, scale = 2) private BigDecimal price;
        @Column(name = "updatedBy") private String updatedBy;
        @UpdateTimestamp @Column(name = "updatedAt") private OffsetDateTime updatedAt;
    }

    @Entity(name = "UserAuth") @Table(name = "usersAuth") @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class UserAuth {
        @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
        @Column(name = "externalAuthUserId") private UUID externalAuthUserId;
        @Enumerated(EnumType.STRING) @Column(name = "role") private Role role;
        @OneToOne(fetch = FetchType.LAZY) @JoinColumn(name = "linkedFarmerId") private Farmer linkedFarmer;
        @Column(name = "officerId") private UUID officerId;
        @Column(name = "traderId") private UUID traderId;
        private String username;
        @Column(name = "passwordHash") private String passwordHash;
        @Column(name = "linkedCentreId") private UUID linkedCentreId;
        @CreationTimestamp @Column(name = "createdAt") private OffsetDateTime createdAt;
        @UpdateTimestamp @Column(name = "updatedAt") private OffsetDateTime updatedAt;
    }

    @Entity(name = "Booking") @Table(name = "bookings") @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Booking {
        @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
        @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "farmerId", nullable = false) private Farmer farmer;
        @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "centreId", nullable = false) private ProcurementCentre centre;
        @Column(name = "bookingDate") private LocalDate bookingDate; @Column(name = "timeSlot") private LocalTime timeSlot;
        @Column(name = "produceQuantity") private BigDecimal produceQuantity; @Column(name = "tokenNumber") private Integer tokenNumber;
        @Column(name = "originalDate") private LocalDate originalDate; @Column(name = "originalTime") private LocalTime originalTime;
        @Column(name = "bookingType") private String bookingType; @Column(name = "weatherAffected") private boolean weatherAffected;
        @Column(name = "reschedulingStatus") private String reschedulingStatus; @Column(name = "emergencySlotId") private UUID emergencySlotId;
        @Column(name = "rescheduledAt") private OffsetDateTime rescheduledAt; @Column(name = "weatherReason") private String weatherReason;
        @Column(name = "currentCounter") private Integer currentCounter; @Column(name = "nextCounter") private Integer nextCounter;
        @Column(name = "nextProcess") private String nextProcess; @Column(name = "officerInstruction") private String officerInstruction;
        @Column(name = "qrId", nullable = false, unique = true, length = 64) private String qrId;
        @Column(name = "qrVersion", nullable = false) @Builder.Default private Integer qrVersion = 1;
        private String status; @CreationTimestamp @Column(name = "createdAt") private OffsetDateTime createdAt;
        @UpdateTimestamp @Column(name = "updatedAt") private OffsetDateTime updatedAt;
    }

    @Entity(name = "EmergencySlot") @Table(name = "emergencySlots", uniqueConstraints = @UniqueConstraint(columnNames = {"centreId", "slotDate", "timeSlot"})) @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class EmergencySlot {
        @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
        @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "centreId", nullable = false) private ProcurementCentre centre;
        @Column(name = "slotDate", nullable = false) private LocalDate slotDate;
        @Column(name = "timeSlot", nullable = false) private LocalTime timeSlot;
        @Column(nullable = false) private Integer capacity;
        @Column(name = "reservedCount", nullable = false) private Integer reservedCount;
        @CreationTimestamp @Column(name = "createdAt") private OffsetDateTime createdAt;
    }

    @Entity(name = "ProcurementStatusLog") @Table(name = "procurementStatusLog") @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ProcurementStatusLog {
        @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
        @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "bookingId") private Booking booking;
        private String stage; private OffsetDateTime timestamp;
        @Column(name = "currentCounter") private Integer currentCounter; @Column(name = "nextCounter") private Integer nextCounter;
        @Column(name = "nextProcess") private String nextProcess; @Column(name = "officerInstruction") private String officerInstruction;
    }

    @Entity(name = "Payment") @Table(name = "payments") @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Payment {
        @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
        @OneToOne(fetch = FetchType.LAZY) @JoinColumn(name = "bookingId") private Booking booking;
        private BigDecimal amount; private String status; @Column(name = "expectedDate") private LocalDate expectedDate;
        @Column(name = "actualDate") private LocalDate actualDate; @Column(name = "delayFlag") private Boolean delayFlag;
        @CreationTimestamp @Column(name = "createdAt") private OffsetDateTime createdAt; @UpdateTimestamp @Column(name = "updatedAt") private OffsetDateTime updatedAt;
    }

    @Entity(name = "QueueSnapshot") @Table(name = "queueSnapshots") @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class QueueSnapshot {
        @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
        @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "centreId") private ProcurementCentre centre;
        private OffsetDateTime timestamp; @Column(name = "currentToken") private Integer currentToken;
        @Column(name = "processedCount") private Integer processedCount; @Column(name = "pendingCount") private Integer pendingCount;
        @Column(name = "activeCounters") private Integer activeCounters;
    }

    @Entity(name = "CentreStats") @Table(name = "centreStats") @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class CentreStats {
        @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
        @OneToOne(fetch = FetchType.LAZY) @JoinColumn(name = "centreId") private ProcurementCentre centre;
        @Column(name = "avgQueueLength") private BigDecimal avgQueueLength; @Column(name = "peakHours", columnDefinition = "jsonb") private String peakHours;
        @Column(name = "avgProcessingSpeed") private BigDecimal avgProcessingSpeed; @Column(name = "bottleneckStage") private String bottleneckStage;
        @Column(name = "staffEfficiencyScore") private BigDecimal staffEfficiencyScore; @Column(name = "lastUpdated") private OffsetDateTime lastUpdated;
    }

    @Entity(name = "CrisisAlert") @Table(name = "crisisAlerts") @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class CrisisAlert {
        @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
        @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "centreId") private ProcurementCentre centre;
        @Column(name = "alertType") private String alertType; private String severity; private String message;
        @Column(name = "suggestedAction") private String suggestedAction; private String status;
        @CreationTimestamp @Column(name = "createdAt") private OffsetDateTime createdAt; @Column(name = "resolvedAt") private OffsetDateTime resolvedAt;
    }

    @Entity(name = "AnomalyFlag") @Table(name = "anomalyFlags") @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class AnomalyFlag {
        @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
        @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "relatedBookingId") private Booking relatedBooking;
        @Column(name = "flagType") private String flagType; private String description; @Column(name = "riskLevel") private String riskLevel;
        private String status; @CreationTimestamp @Column(name = "createdAt") private OffsetDateTime createdAt;
    }

    @Entity(name = "Notification") @Table(name = "notifications") @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Notification {
        @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
        @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "farmerId") private Farmer farmer;
        private String channel; private String message; @Column(name = "sentAt") private OffsetDateTime sentAt;
        private String status; @CreationTimestamp @Column(name = "createdAt") private OffsetDateTime createdAt;
    }

    @Entity(name = "CropQualityCheck") @Table(name = "cropQualityChecks") @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class CropQualityCheck {
        @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
        @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "bookingId") private Booking booking;
        @Column(name = "imageUrl") private String imageUrl; @Column(name = "aiRiskResult") private String aiRiskResult;
        @Column(name = "finalVerifiedResult") private String finalVerifiedResult; @Column(name = "verifiedBy") private UUID verifiedBy;
    }

    /**
     * Tracks physical entry/exit of a farmer at the mandi gate.
     * One record per booking, created lazily on first QR scan.
     * entryStatus: PENDING → ENTERED → EXITED
     */
    @Entity(name = "MandiEntryExit") @Table(name = "mandiEntryExit") @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class MandiEntryExit {
        @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
        @OneToOne(fetch = FetchType.LAZY) @JoinColumn(name = "bookingId", nullable = false, unique = true) private Booking booking;
        @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "farmerId", nullable = false) private Farmer farmer;
        @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "centreId", nullable = false) private ProcurementCentre centre;
        @Column(name = "qrId", nullable = false, length = 64) private String qrId;
        @Column(name = "entryTime") private OffsetDateTime entryTime;
        @Column(name = "exitTime")  private OffsetDateTime exitTime;
        @Column(name = "insideMandi", nullable = false) @Builder.Default private Boolean insideMandi = false;
        @Column(name = "entryStatus", nullable = false, length = 20) @Builder.Default private String entryStatus = "PENDING";
        @Column(name = "exitStatus",  nullable = false, length = 20) @Builder.Default private String exitStatus  = "NOT_EXITED";
        @CreationTimestamp @Column(name = "createdAt") private OffsetDateTime createdAt;
        @UpdateTimestamp  @Column(name = "updatedAt") private OffsetDateTime updatedAt;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class TokenSequenceId implements java.io.Serializable {
        private UUID centre;
        private LocalDate bookingDate;
    }

    @Entity(name = "TokenSequence") @Table(name = "tokenSequences") @Data @NoArgsConstructor @AllArgsConstructor @Builder
    @IdClass(TokenSequenceId.class)
    public static class TokenSequence {
        @Id @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "centreId", nullable = false) private ProcurementCentre centre;
        @Id @Column(name = "bookingDate", nullable = false) private LocalDate bookingDate;
        @Column(name = "lastToken", nullable = false) @Builder.Default private Integer lastToken = 0;
    }

    @Entity(name = "Trader") @Table(name = "traders") @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Trader {
        @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
        private String name;
        @Column(name = "mobileNumber") private String mobileNumber;
        @Column(name = "licenseNumber", unique = true) private String licenseNumber;
        @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "linkedCentreId") private ProcurementCentre linkedCentre;
        @CreationTimestamp @Column(name = "createdAt") private OffsetDateTime createdAt;
        @UpdateTimestamp @Column(name = "updatedAt") private OffsetDateTime updatedAt;
    }

    @Entity(name = "Lot") @Table(name = "lots") @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Lot {
        @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
        @OneToOne(fetch = FetchType.LAZY) @JoinColumn(name = "bookingId", nullable = false, unique = true) private Booking booking;
        @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "centreId", nullable = false) private ProcurementCentre centre;
        @Column(name = "actualWeight", nullable = false) private BigDecimal actualWeight;
        @Column(name = "qualityGrade") private String qualityGrade;
        @Column(nullable = false) @Builder.Default private String status = "open";
        @Column(name = "basePrice", nullable = false) private BigDecimal basePrice;
        @CreationTimestamp @Column(name = "createdAt") private OffsetDateTime createdAt;
        @UpdateTimestamp @Column(name = "updatedAt") private OffsetDateTime updatedAt;
    }

    @Entity(name = "Bid") @Table(name = "bids") @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Bid {
        @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
        @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "lotId", nullable = false) private Lot lot;
        @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "traderId", nullable = false) private Trader trader;
        @Column(nullable = false) private BigDecimal amount;
        @Column(nullable = false) @Builder.Default private String status = "placed";
        @CreationTimestamp @Column(name = "createdAt") private OffsetDateTime createdAt;
    }
}
