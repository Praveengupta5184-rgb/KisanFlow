package com.kisanflow;

import com.kisanflow.dto.KisanFlowDtos.BookingRequest;
import com.kisanflow.dto.KisanFlowDtos.BookingResponse;
import com.kisanflow.entity.KisanFlowEntities.Farmer;
import com.kisanflow.entity.KisanFlowEntities.ProcurementCentre;
import com.kisanflow.repository.KisanFlowRepositories.BookingRepository;
import com.kisanflow.repository.KisanFlowRepositories.CentreRepository;
import com.kisanflow.repository.KisanFlowRepositories.FarmerRepository;
import com.kisanflow.service.KisanFlowServices.BookingService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.*;

/**
 * High-concurrency test: N farmers try to book tokens for the same centre+date simultaneously.
 *
 * Validates:
 *  1. Zero duplicate tokenNumbers in the DB.
 *  2. Zero duplicate qrIds in the DB.
 *  3. Successful bookings = N (no silent failures).
 *
 * N = 500 threads (simulates real-world burst; scales to 10,000 on production hardware
 * with connection pool tuning).
 *
 * Prerequisites: a running PostgreSQL instance (via docker-compose or Testcontainers).
 */
@SpringBootTest
@ActiveProfiles("test")
class TokenConcurrencyTest {

    @Autowired BookingService bookingService;
    @Autowired FarmerRepository farmerRepo;
    @Autowired CentreRepository centreRepo;
    @Autowired BookingRepository bookingRepo;

    private static final int CONCURRENCY = 500;
    private static final LocalDate BOOKING_DATE = LocalDate.now().plusDays(30); // future date to avoid @FutureOrPresent conflict
    private static final LocalTime BOOKING_TIME = LocalTime.of(10, 0);

    @Test
    void concurrentBookings_shouldProduceNoDuplicateTokensOrQrIds() throws Exception {
        // ── Setup: one test centre, CONCURRENCY farmers ─────────────────────
        ProcurementCentre centre = centreRepo.save(ProcurementCentre.builder()
            .name("ConcurrencyTest Centre")
            .address("Test Street")
            .latitude(BigDecimal.valueOf(30.0))
            .longitude(BigDecimal.valueOf(75.0))
            .capacity(CONCURRENCY + 100)
            .staffCount(10)
            .currentLoad(0)
            .processingSpeed(BigDecimal.valueOf(60))
            .status("active")
            .build());

        List<Farmer> farmers = new ArrayList<>();
        for (int i = 0; i < CONCURRENCY; i++) {
            farmers.add(farmerRepo.save(Farmer.builder()
                .name("ConcTest Farmer " + i)
                .mobileNumber("9" + String.format("%09d", i))
                .village("TestVillage")
                .cropType("Wheat")
                .preferredLanguage("hi")
                .build()));
        }

        // ── Concurrent booking ────────────────────────────────────────────────
        ExecutorService pool = Executors.newFixedThreadPool(CONCURRENCY);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(CONCURRENCY);
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failCount = new AtomicInteger(0);
        List<BookingResponse> results = Collections.synchronizedList(new ArrayList<>());

        for (Farmer farmer : farmers) {
            pool.submit(() -> {
                try {
                    start.await(); // synchronize thread start
                    BookingRequest req = BookingRequest.builder()
                        .farmerId(farmer.getId())
                        .centreId(centre.getId())
                        .bookingDate(BOOKING_DATE)
                        .timeSlot(BOOKING_TIME)
                        .produceQuantity(BigDecimal.TEN)
                        .build();
                    BookingResponse response = bookingService.create(req);
                    results.add(response);
                    successCount.incrementAndGet();
                } catch (Exception ex) {
                    failCount.incrementAndGet();
                    System.err.println("[FAIL] " + ex.getMessage());
                } finally {
                    done.countDown();
                }
            });
        }

        start.countDown(); // fire all threads simultaneously
        done.await(2, TimeUnit.MINUTES);
        pool.shutdown();

        // ── Assertions ────────────────────────────────────────────────────────
        System.out.printf("Concurrency test: %d success, %d fail%n", successCount.get(), failCount.get());

        assertThat(successCount.get())
            .as("All %d bookings should succeed", CONCURRENCY)
            .isEqualTo(CONCURRENCY);

        // Verify via DB — no duplicates in tokenNumber
        List<Integer> tokenNumbers = bookingRepo
            .findByCentreIdAndBookingDateAndStatusInOrderByTokenNumber(
                centre.getId(), BOOKING_DATE, Set.of("token_generated"))
            .stream().map(b -> b.getTokenNumber()).toList();

        assertThat(tokenNumbers)
            .as("No duplicate token numbers")
            .doesNotHaveDuplicates()
            .hasSize(CONCURRENCY);

        // Verify no duplicate qrIds
        List<String> qrIds = bookingRepo
            .findByCentreIdAndBookingDateAndStatusInOrderByTokenNumber(
                centre.getId(), BOOKING_DATE, Set.of("token_generated"))
            .stream().map(b -> b.getQrId()).toList();

        assertThat(qrIds)
            .as("No duplicate QR IDs")
            .doesNotHaveDuplicates()
            .hasSize(CONCURRENCY);

        System.out.println("✅ Zero duplicate tokens. Zero duplicate QR IDs. Test PASSED.");
    }
}
