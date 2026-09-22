package com.kisanflow.service;

import com.kisanflow.dto.KisanFlowDtos.*;
import com.kisanflow.entity.KisanFlowEntities.*;
import com.kisanflow.repository.KisanFlowRepositories.*;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.context.ApplicationEventPublisher;
import com.kisanflow.notification.NotificationModule.LotEvent;
import com.kisanflow.notification.NotificationModule.ProcurementEvent;
import com.kisanflow.realtime.RealtimeEventPublisher;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public final class TraderServices {
    private TraderServices() {}
    static <T> T required(Optional<T> value, String type, UUID id) { return value.orElseThrow(() -> new EntityNotFoundException(type + " not found: " + id)); }

    @Service @RequiredArgsConstructor
    public static class LotService {
        private final LotRepository lots;
        private final BookingRepository bookings;
        private final CentreRepository centres;
        private final BidRepository bids;
        private final RealtimeEventPublisher publisher;
        private final ApplicationEventPublisher appEventPublisher;

        @Transactional
        public LotResponse createLot(UUID bookingId, BigDecimal actualWeight, BigDecimal basePrice, String qualityGrade) {
            Booking b = required(bookings.findById(bookingId), "Booking", bookingId);
            Lot lot = lots.save(Lot.builder()
                .booking(b).centre(b.getCentre())
                .actualWeight(actualWeight).basePrice(basePrice)
                .qualityGrade(qualityGrade).status("open").build());
            LotResponse res = map(lot);
            publisher.publishCentreEvent(b.getCentre().getId(), "/auctions", "LOT_CREATED", res);
            appEventPublisher.publishEvent(new LotEvent(b.getFarmer().getId(), b.getCentre().getId(), "Your lot has been officially created at " + b.getCentre().getName() + " with weight " + actualWeight + "q."));
            return res;
        }

        @Transactional(readOnly = true)
        public List<LotResponse> getActiveLots(UUID centreId) {
            return lots.findByCentreIdAndStatus(centreId, "open").stream().map(this::map).toList();
        }

        @Transactional(readOnly = true)
        public Optional<LotResponse> getLotByBooking(UUID bookingId) {
            return lots.findByBookingId(bookingId).map(this::map);
        }

        public LotResponse map(Lot lot) {
            List<Bid> currentBids = bids.findByLotIdOrderByAmountDesc(lot.getId());
            BigDecimal highestBid = currentBids.isEmpty() ? null : currentBids.get(0).getAmount();
            UUID highestBidder = currentBids.isEmpty() ? null : currentBids.get(0).getTrader().getId();
            
            return LotResponse.builder().id(lot.getId()).bookingId(lot.getBooking().getId())
                .centreId(lot.getCentre().getId()).lotNumber("LOT-" + lot.getId().toString().substring(0, 8).toUpperCase())
                .actualWeight(lot.getActualWeight())
                .basePrice(lot.getBasePrice()).qualityGrade(lot.getQualityGrade())
                .status(lot.getStatus()).createdAt(lot.getCreatedAt()).updatedAt(lot.getUpdatedAt())
                .highestBidAmount(highestBid).highestBidderId(highestBidder).build();
        }
    }

    @Service @RequiredArgsConstructor
    public static class AuctionService {
        private final BidRepository bids;
        private final LotRepository lots;
        private final TraderRepository traders;
        private final RealtimeEventPublisher publisher;
        private final ApplicationEventPublisher appEventPublisher;

        @Transactional
        public BidResponse placeBid(UUID lotId, BidRequest req) {
            Lot lot = required(lots.findById(lotId), "Lot", lotId);
            if (!"open".equals(lot.getStatus())) throw new IllegalStateException("Lot is not open for bidding");
            Trader trader = required(traders.findById(req.getTraderId()), "Trader", req.getTraderId());
            if (req.getAmount().compareTo(lot.getBasePrice()) < 0) throw new IllegalArgumentException("Bid amount must be greater than base price");
            
            // Check against highest bid
            List<Bid> currentBids = bids.findByLotIdOrderByAmountDesc(lotId);
            if (!currentBids.isEmpty() && req.getAmount().compareTo(currentBids.get(0).getAmount()) <= 0) {
                throw new IllegalArgumentException("Bid amount must be greater than current highest bid");
            }
            
            Bid bid = bids.save(Bid.builder().lot(lot).trader(trader).amount(req.getAmount()).build());
            BidResponse res = map(bid);
            publisher.publishCentreEvent(lot.getCentre().getId(), "/bids/" + lotId, "BID_UPDATED", res);
            return res;
        }

        @Transactional
        public LotResponse closeAuction(UUID lotId) {
            Lot lot = required(lots.findById(lotId), "Lot", lotId);
            lot.setStatus("closed");
            lots.save(lot);
            LotResponse res = LotResponse.builder().id(lot.getId()).status("closed").build();
            publisher.publishCentreEvent(lot.getCentre().getId(), "/auctions", "AUCTION_CLOSED", res);
            
            // Notify farmer
            appEventPublisher.publishEvent(new ProcurementEvent(lot.getBooking().getFarmer().getId(), lot.getCentre().getId(), "The auction for your lot has closed. Procurement details will be finalized shortly."));
            
            return res;
        }

        public BidResponse map(Bid bid) {
            return BidResponse.builder().id(bid.getId()).lotId(bid.getLot().getId())
                .traderId(bid.getTrader().getId()).amount(bid.getAmount())
                .status(bid.getStatus()).createdAt(bid.getCreatedAt()).build();
        }
    }
}
