package com.kisanflow.repository;

import com.kisanflow.entity.KisanFlowEntities.*;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.time.*;
import java.util.*;

public final class KisanFlowRepositories {
    private KisanFlowRepositories() {}
    public interface FarmerRepository extends JpaRepository<Farmer, UUID> { Optional<Farmer> findByMobileNumber(String mobileNumber); }
    public interface CentreRepository extends JpaRepository<ProcurementCentre, UUID> {
        @Query("select c from ProcurementCentre c where cast(c.status as string) = :status")
        List<ProcurementCentre> findByStatus(@Param("status") String status);
    }
    public interface CropPriceRepository extends JpaRepository<CropPrice, UUID> { List<CropPrice> findByCentreIdOrderByCropType(UUID centreId); Optional<CropPrice> findByCentreIdAndCropType(UUID centreId, String cropType); }
    public interface BookingRepository extends JpaRepository<Booking, UUID> {
        List<Booking> findByFarmerIdAndStatusIn(UUID farmerId, Collection<String> status);
        List<Booking> findByCentreIdAndBookingDateAndStatusInOrderByTokenNumber(UUID centreId, LocalDate bookingDate, Collection<String> status);
        List<Booking> findByCentreIdAndBookingDateBetweenAndStatusInOrderByTokenNumber(UUID centreId, LocalDate from, LocalDate to, Collection<String> status);
        @Query("select coalesce(max(b.tokenNumber), 0) from Booking b where b.centre.id=:centreId and b.bookingDate=:bookingDate")
        Integer nextTokenBase(@Param("centreId") UUID centreId, @Param("bookingDate") LocalDate bookingDate);
        @Query(value = "select pg_advisory_xact_lock(hashtextextended(cast(:centreId as text) || cast(:bookingDate as text), 0))", nativeQuery = true)
        void lockTokenAllocation(@Param("centreId") UUID centreId, @Param("bookingDate") LocalDate bookingDate);
        long countByCentreIdAndBookingDateAndStatusIn(UUID centreId, LocalDate bookingDate, Collection<String> statuses);
        List<Booking> findByFarmerIdAndWeatherAffectedTrueAndReschedulingStatus(UUID farmerId, String status);
        long countByCentreIdAndWeatherAffectedTrue(UUID centreId);
        long countByCentreIdAndReschedulingStatus(UUID centreId, String status);
        Optional<Booking> findByCentreIdAndBookingDateAndTokenNumber(UUID centreId, LocalDate bookingDate, Integer tokenNumber);
    }
    public interface EmergencySlotRepository extends JpaRepository<EmergencySlot, UUID> {
        @Lock(LockModeType.PESSIMISTIC_WRITE)
        @Query("select s from EmergencySlot s where s.centre.id=:centreId and s.slotDate=:slotDate and s.timeSlot=:timeSlot")
        Optional<EmergencySlot> lockSlot(@Param("centreId") UUID centreId, @Param("slotDate") LocalDate slotDate, @Param("timeSlot") LocalTime timeSlot);
        List<EmergencySlot> findByCentreIdAndSlotDateBetweenOrderBySlotDateAscTimeSlotAsc(UUID centreId, LocalDate from, LocalDate to);
        long countByCentreIdAndReservedCountLessThan(UUID centreId, Integer capacity);
    }
    public interface StatusLogRepository extends JpaRepository<ProcurementStatusLog, UUID> { List<ProcurementStatusLog> findByBookingIdOrderByTimestampAsc(UUID bookingId); }
    public interface PaymentRepository extends JpaRepository<Payment, UUID> {
        Optional<Payment> findByBookingId(UUID bookingId);
        @Query("select p from Payment p where cast(p.status as string) in :statuses and p.expectedDate < :date")
        List<Payment> findByStatusInAndExpectedDateBefore(@Param("statuses") Collection<String> statuses, @Param("date") LocalDate date);
    }
    public interface QueueSnapshotRepository extends JpaRepository<QueueSnapshot, UUID> { Optional<QueueSnapshot> findFirstByCentreIdOrderByTimestampDesc(UUID centreId); List<QueueSnapshot> findByCentreIdAndTimestampAfterOrderByTimestampAsc(UUID centreId, OffsetDateTime from); }
    public interface CentreStatsRepository extends JpaRepository<CentreStats, UUID> { Optional<CentreStats> findByCentreId(UUID centreId); }
    public interface CrisisAlertRepository extends JpaRepository<CrisisAlert, UUID> {
        @Query("select ca from CrisisAlert ca where cast(ca.status as string) in :statuses order by ca.createdAt desc")
        List<CrisisAlert> findByStatusInOrderByCreatedAtDesc(@Param("statuses") Collection<String> statuses);
    }
    public interface AnomalyFlagRepository extends JpaRepository<AnomalyFlag, UUID> {
        @Query("select a from AnomalyFlag a where cast(a.status as string) in :statuses order by a.createdAt desc")
        List<AnomalyFlag> findByStatusInOrderByCreatedAtDesc(@Param("statuses") Collection<String> statuses);
    }
    public interface NotificationRepository extends JpaRepository<Notification, UUID> { }
    public interface QualityCheckRepository extends JpaRepository<CropQualityCheck, UUID> { }
    public interface UserAuthRepository extends JpaRepository<UserAuth, UUID> {
        Optional<UserAuth> findByUsername(String username);
        @EntityGraph(attributePaths = "linkedFarmer")
        Optional<UserAuth> findByLinkedFarmerMobileNumber(String mobileNumber);
    }

    /** Repository for physical mandi entry/exit records. */
    public interface MandiEntryExitRepository extends JpaRepository<MandiEntryExit, UUID> {
        /** Pessimistic lock – prevents two concurrent scans of the same QR from racing. */
        @Lock(LockModeType.PESSIMISTIC_WRITE)
        @Query("select m from MandiEntryExit m where m.booking.id = :bookingId")
        Optional<MandiEntryExit> lockByBookingId(@Param("bookingId") UUID bookingId);

        Optional<MandiEntryExit> findByQrId(String qrId);

        /** True DB count — source of truth for mandi occupancy. */
        long countByCentreIdAndInsideMandi(UUID centreId, boolean insideMandi);

        Optional<MandiEntryExit> findByBookingId(UUID bookingId);
    }

    public interface TokenSequenceRepository extends JpaRepository<TokenSequence, TokenSequenceId> {
        @Lock(LockModeType.PESSIMISTIC_WRITE)
        @Query("select t from TokenSequence t where t.centre.id = :centreId and t.bookingDate = :bookingDate")
        Optional<TokenSequence> lockSequence(@Param("centreId") UUID centreId, @Param("bookingDate") LocalDate bookingDate);
    }

    public interface TraderRepository extends JpaRepository<Trader, UUID> {
        Optional<Trader> findByMobileNumber(String mobileNumber);
        Optional<Trader> findByLicenseNumber(String licenseNumber);
    }

    public interface LotRepository extends JpaRepository<Lot, UUID> {
        List<Lot> findByCentreIdAndStatus(UUID centreId, String status);
        Optional<Lot> findByBookingId(UUID bookingId);
    }

    public interface BidRepository extends JpaRepository<Bid, UUID> {
        List<Bid> findByLotIdOrderByAmountDesc(UUID lotId);
    }
}
