package com.kisanflow.service;

import com.kisanflow.demo.InMemoryDemoStore;
import com.kisanflow.dto.KisanFlowDtos.*;
import com.kisanflow.entity.KisanFlowEntities.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.context.ApplicationEventPublisher;
import com.kisanflow.notification.NotificationModule.LotEvent;
import com.kisanflow.notification.NotificationModule.ProcurementEvent;
import com.kisanflow.realtime.RealtimeEventPublisher;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

public final class TraderServices {
    private TraderServices() {}
    static <T> T required(T value, String type, UUID id) { 
        if (value == null) throw new IllegalArgumentException(type + " not found: " + id);
        return value; 
    }

    @Service @RequiredArgsConstructor
    public static class LotService {
        private final InMemoryDemoStore store;
        private final RealtimeEventPublisher publisher;
        private final ApplicationEventPublisher appEventPublisher;

        public LotResponse createLot(UUID bookingId, BigDecimal actualWeight, BigDecimal basePrice, String qualityGrade) {
            Booking b = required(store.getBookingById(bookingId), "Booking", bookingId);
            Lot lot = Lot.builder()
                .id(UUID.randomUUID())
                .booking(b).centre(b.getCentre())
                .actualWeight(actualWeight).basePrice(basePrice)
                .qualityGrade(qualityGrade).status("open")
                .auctionExpiresAt(OffsetDateTime.now().plusHours(48))
                .createdAt(OffsetDateTime.now())
                .updatedAt(OffsetDateTime.now())
                .build();
            store.saveLot(lot);
            LotResponse res = map(lot);

            // Notify all traders watching this centre's auction board
            publisher.publishCentreEvent(b.getCentre().getId(), "/auctions", "LOT_CREATED", res);

            // Notify the farmer directly so their ProcurementTrackerPage updates live
            publisher.publishFarmerEvent(b.getFarmer().getId(), "/lot", "LOT_CREATED", res);

            appEventPublisher.publishEvent(new LotEvent(b.getFarmer().getId(), b.getCentre().getId(), "Your lot has been officially created at " + b.getCentre().getName() + " with weight " + actualWeight + "q."));
            return res;
        }

        public List<LotResponse> getActiveLots(UUID centreId) {
            return store.getAllLots().stream()
                .filter(l -> l.getCentre().getId().equals(centreId) && "open".equals(l.getStatus()) && OffsetDateTime.now().isBefore(l.getAuctionExpiresAt()))
                .map(this::map).toList();
        }

        public Optional<LotResponse> getLotByBooking(UUID bookingId) {
            return store.getAllLots().stream()
                .filter(l -> l.getBooking().getId().equals(bookingId))
                .findFirst()
                .map(this::map);
        }

        public LotResponse map(Lot lot) {
            List<Bid> currentBids = store.getAllBids().stream()
                .filter(b -> b.getLot().getId().equals(lot.getId()))
                .sorted(Comparator.comparing(Bid::getAmount).reversed())
                .toList();
                
            BigDecimal highestBid = currentBids.isEmpty() ? null : currentBids.get(0).getAmount();
            UUID highestBidder = currentBids.isEmpty() ? null : currentBids.get(0).getTrader().getId();
            UUID highestBidId = currentBids.isEmpty() ? null : currentBids.get(0).getId();
            
            return LotResponse.builder().id(lot.getId()).bookingId(lot.getBooking().getId())
                .centreId(lot.getCentre().getId()).lotNumber("LOT-" + lot.getId().toString().substring(0, 8).toUpperCase())
                .actualWeight(lot.getActualWeight())
                .basePrice(lot.getBasePrice()).qualityGrade(lot.getQualityGrade())
                .status(lot.getStatus()).auctionExpiresAt(lot.getAuctionExpiresAt())
                .createdAt(lot.getCreatedAt()).updatedAt(lot.getUpdatedAt())
                .highestBidAmount(highestBid).highestBidderId(highestBidder)
                .highestBidId(highestBidId).acceptedBidId(lot.getAcceptedBidId())
                .winningTraderId(lot.getWinningTraderId()).acceptedAt(lot.getAcceptedAt()).build();
        }
    }

    @Service @RequiredArgsConstructor
    public static class AuctionService {
        private final InMemoryDemoStore store;
        private final RealtimeEventPublisher publisher;
        private final ApplicationEventPublisher appEventPublisher;
        private final LotService lotService;

        public BidResponse placeBid(UUID lotId, BidRequest req) {
            Lot lot = required(store.getLotById(lotId), "Lot", lotId);
            // Reject if already finalized by farmer
            if ("BID_ACCEPTED".equals(lot.getStatus())) throw new IllegalStateException("Auction already finalized — farmer has accepted a bid");
            if (!"open".equals(lot.getStatus()) && !"closed".equals(lot.getStatus())) throw new IllegalStateException("Lot is not open for bidding");
            if (OffsetDateTime.now().isAfter(lot.getAuctionExpiresAt()) && !"open".equals(lot.getStatus())) throw new IllegalStateException("Lot auction has expired");
            Trader trader = required(store.getTraderById(req.getTraderId()), "Trader", req.getTraderId());
            if (req.getAmount().compareTo(lot.getBasePrice()) < 0) throw new IllegalArgumentException("Bid amount must be at or above base price");
            
            // Check against highest bid
            List<Bid> currentBids = store.getAllBids().stream()
                .filter(b -> b.getLot().getId().equals(lotId))
                .sorted(Comparator.comparing(Bid::getAmount).reversed())
                .toList();
                
            if (!currentBids.isEmpty() && req.getAmount().compareTo(currentBids.get(0).getAmount()) <= 0) {
                throw new IllegalArgumentException("Bid amount must be greater than current highest bid of ₹" + currentBids.get(0).getAmount());
            }
            
            Bid bid = Bid.builder().id(UUID.randomUUID()).lot(lot).trader(trader).amount(req.getAmount())
                .status("placed").createdAt(OffsetDateTime.now()).build();
            store.saveBid(bid);
            
            BidResponse res = map(bid);

            // Notify all traders watching this centre's lot bids
            publisher.publishCentreEvent(lot.getCentre().getId(), "/bids/" + lotId, "BID_UPDATED", res);

            // Notify the farmer who owns this lot so they see live highest bid + updated Accept button
            UUID farmerId = lot.getBooking().getFarmer().getId();
            publisher.publishFarmerEvent(farmerId, "/auctions", "BID_UPDATED", lotService.map(lot));

            return res;
        }

        public LotResponse closeAuction(UUID lotId) {
            Lot lot = required(store.getLotById(lotId), "Lot", lotId);
            if ("BID_ACCEPTED".equals(lot.getStatus())) throw new IllegalStateException("Auction already finalized by farmer");
            lot.setStatus("closed");
            lot.setUpdatedAt(OffsetDateTime.now());
            store.saveLot(lot);

            LotResponse res = lotService.map(lot);

            // Notify traders watching the centre auction board
            publisher.publishCentreEvent(lot.getCentre().getId(), "/auctions", "AUCTION_CLOSED", res);

            // Notify the farmer directly — they can still accept the highest bid
            UUID farmerId = lot.getBooking().getFarmer().getId();
            publisher.publishFarmerEvent(farmerId, "/auctions", "AUCTION_CLOSED", res);
            
            // Notify farmer via DB notification channel
            appEventPublisher.publishEvent(new ProcurementEvent(farmerId, lot.getCentre().getId(), "Auction time has expired. Review the highest bid and accept if satisfactory."));
            
            return res;
        }

        // Concurrency lock map per lot ID (prevents double-accept race condition)
        private final java.util.concurrent.ConcurrentHashMap<UUID, Object> lotLocks = new java.util.concurrent.ConcurrentHashMap<>();

        public LotResponse acceptBid(UUID bidId, UUID farmerId) {
            Bid bid = store.getAllBids().stream().filter(b -> b.getId().equals(bidId)).findFirst()
                    .orElseThrow(() -> new IllegalArgumentException("Bid not found: " + bidId));
            Lot lot = bid.getLot();
            
            // Authorization: only the farmer who owns the lot can accept
            if (!lot.getBooking().getFarmer().getId().equals(farmerId)) {
                throw new IllegalStateException("You do not own this lot");
            }
            
            // Concurrency: synchronize on a per-lot lock object
            Object lock = lotLocks.computeIfAbsent(lot.getId(), k -> new Object());
            synchronized (lock) {
                // Re-fetch the latest lot state inside the lock (in-memory: same object reference is fine)
                Lot freshLot = store.getLotById(lot.getId());
                if (freshLot == null) throw new IllegalArgumentException("Lot not found: " + lot.getId());
                
                // Idempotency: if this exact bid is already accepted, return current state
                if (bidId.equals(freshLot.getAcceptedBidId())) {
                    return lotService.map(freshLot);
                }
                
                // Reject if already finalized with a different bid
                if ("BID_ACCEPTED".equals(freshLot.getStatus()) || "SOLD".equals(freshLot.getStatus())) {
                    throw new IllegalStateException("Auction already finalized — another bid was already accepted");
                }
                if ("EXPIRED".equals(freshLot.getStatus())) {
                    throw new IllegalStateException("Lot auction has expired and cannot be accepted");
                }
                // Allow acceptance on BOTH 'open' (live) AND 'closed' (timer-expired) lots
                if (!"open".equals(freshLot.getStatus()) && !"closed".equals(freshLot.getStatus())) {
                    throw new IllegalStateException("Lot is in an invalid state for acceptance: " + freshLot.getStatus());
                }
                
                // Require at least one bid to exist
                boolean bidBelongsToLot = store.getAllBids().stream()
                    .anyMatch(b -> b.getLot().getId().equals(freshLot.getId()) && b.getId().equals(bidId));
                if (!bidBelongsToLot) {
                    throw new IllegalArgumentException("Bid does not belong to this lot");
                }
                
                // Mark winning bid as ACCEPTED
                bid.setStatus("ACCEPTED");
                
                // Mark lot as BID_ACCEPTED (atomically terminates the auction)
                freshLot.setAcceptedBidId(bidId);
                freshLot.setWinningTraderId(bid.getTrader().getId());
                freshLot.setAcceptedAt(OffsetDateTime.now());
                freshLot.setStatus("BID_ACCEPTED");
                freshLot.setUpdatedAt(OffsetDateTime.now());
                store.saveLot(freshLot);
                
                // Mark all other bids as OUTBID
                store.getAllBids().stream()
                    .filter(b -> b.getLot().getId().equals(freshLot.getId()) && !b.getId().equals(bidId))
                    .forEach(b -> b.setStatus("OUTBID"));
                
                LotResponse lotRes = lotService.map(freshLot);
                
                // Create exactly ONE PAYMENT_REQUIRED record for the winning trader
                boolean paymentExists = store.getAllPayments().stream()
                    .anyMatch(p -> freshLot.getId().equals(p.getLot() != null ? p.getLot().getId() : null));
                if (!paymentExists) {
                    Payment p = Payment.builder()
                            .id(UUID.randomUUID())
                            .booking(freshLot.getBooking())
                            .trader(bid.getTrader())
                            .lot(freshLot)
                            .bidId(bidId)
                            .amount(bid.getAmount().multiply(freshLot.getActualWeight()))
                            .status("PAYMENT_REQUIRED")
                            .createdAt(OffsetDateTime.now())
                            .updatedAt(OffsetDateTime.now())
                            .build();
                    store.savePayment(p);
                }
                
                // Fire realtime events to all three roles simultaneously
                // 1. Farmer: confirm acceptance
                publisher.publishFarmerEvent(farmerId, "/auctions", "BID_ACCEPTED", lotRes);
                // 2. Winning trader: unlock Pay Now
                publisher.publishTraderEvent(bid.getTrader().getId(), "/payments", "PAYMENT_REQUIRED", lotRes);
                // 3. ALL traders watching the centre board: auction finalized
                publisher.publishCentreEvent(freshLot.getCentre().getId(), "/auctions", "BID_ACCEPTED", lotRes);
                
                // Clean up lock after use (optional hygiene)
                lotLocks.remove(freshLot.getId());
                
                return lotRes;
            }
        }

        public List<BidResponse> getBidsForLot(UUID lotId) {
            return store.getAllBids().stream()
                .filter(b -> b.getLot().getId().equals(lotId))
                .sorted(Comparator.comparing(Bid::getAmount).reversed())
                .map(this::map)
                .collect(Collectors.toList());
        }

        public BidResponse map(Bid bid) {
            return BidResponse.builder().id(bid.getId()).lotId(bid.getLot().getId())
                .traderId(bid.getTrader().getId())
                .traderName(bid.getTrader().getName())
                .amount(bid.getAmount())
                .status(bid.getStatus()).createdAt(bid.getCreatedAt()).build();
        }
    }
}
