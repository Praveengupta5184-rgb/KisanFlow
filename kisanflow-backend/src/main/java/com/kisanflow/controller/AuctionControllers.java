package com.kisanflow.controller;

import com.kisanflow.dto.KisanFlowDtos.*;
import com.kisanflow.service.TraderServices.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/auctions")
@Validated
@RequiredArgsConstructor
public class AuctionControllers {

    private final LotService lotService;
    private final AuctionService auctionService;
    private final com.kisanflow.security.SecurityComponents.Users users;

    // For Officer: Create Lot after verification
    @PostMapping("/lots")
    @PreAuthorize("hasAnyRole('OFFICER','DISTRICT_OFFICER')")
    public ResponseEntity<LotResponse> createLot(@RequestParam UUID bookingId, @RequestParam BigDecimal weight, @RequestParam BigDecimal price, @RequestParam(required=false) String grade) {
        return ResponseEntity.ok(lotService.createLot(bookingId, weight, price, grade));
    }

    // For Trader/Officer: Get active lots
    @GetMapping("/lots")
    @PreAuthorize("hasAnyRole('OFFICER','DISTRICT_OFFICER','TRADER')")
    public ResponseEntity<List<LotResponse>> getActiveLots(@RequestParam UUID centreId) {
        return ResponseEntity.ok(lotService.getActiveLots(centreId));
    }

    // For Farmer: Get lot by booking ID
    @GetMapping("/lots/booking/{bookingId}")
    @PreAuthorize("hasAnyRole('OFFICER','DISTRICT_OFFICER','TRADER') or @securityService.isBookingOwner(authentication, #bookingId)")
    public ResponseEntity<LotResponse> getLotByBooking(@PathVariable UUID bookingId) {
        return lotService.getLotByBooking(bookingId).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    // For Trader: Place a bid
    @PostMapping("/lots/{lotId}/bids")
    @PreAuthorize("hasRole('TRADER')")
    public ResponseEntity<BidResponse> placeBid(@PathVariable UUID lotId, @Valid @RequestBody BidRequest req, org.springframework.security.core.Authentication auth) {
        // Enforce RBAC: Ignore client-provided traderId, use the authenticated user's actual trader ID
        UUID actualTraderId = users.byId((UUID) auth.getPrincipal()).getTraderId();
        req.setTraderId(actualTraderId);
        return ResponseEntity.ok(auctionService.placeBid(lotId, req));
    }

    // For Farmer: Accept a bid (works on LIVE open lots — primary flow)
    @PostMapping("/bids/{bidId}/accept")
    @PreAuthorize("hasRole('FARMER')")
    public ResponseEntity<LotResponse> acceptBid(@PathVariable UUID bidId, org.springframework.security.core.Authentication auth) {
        UUID actualFarmerId = users.byId((UUID) auth.getPrincipal()).getLinkedFarmer().getId();
        return ResponseEntity.ok(auctionService.acceptBid(bidId, actualFarmerId));
    }

    // For Farmer/Officer/Trader: Get all bids for a lot
    @GetMapping("/lots/{lotId}/bids")
    @PreAuthorize("hasAnyRole('OFFICER','DISTRICT_OFFICER','TRADER','FARMER')")
    public ResponseEntity<java.util.List<BidResponse>> getBidsForLot(@PathVariable UUID lotId) {
        java.util.List<BidResponse> bids = auctionService.getBidsForLot(lotId);
        return ResponseEntity.ok(bids);
    }

    // For Officer: Close Auction
    @PostMapping("/lots/{lotId}/close")
    @PreAuthorize("hasAnyRole('OFFICER','DISTRICT_OFFICER')")
    public ResponseEntity<LotResponse> closeAuction(@PathVariable UUID lotId) {
        return ResponseEntity.ok(auctionService.closeAuction(lotId));
    }
}
