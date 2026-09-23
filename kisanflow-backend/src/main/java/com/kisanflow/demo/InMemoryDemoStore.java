package com.kisanflow.demo;

import com.kisanflow.entity.KisanFlowEntities.*;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Component
public class InMemoryDemoStore {

    // Main entity stores
    private final Map<UUID, UserAuth> users = new ConcurrentHashMap<>();
    private final Map<UUID, Farmer> farmers = new ConcurrentHashMap<>();
    private final Map<UUID, ProcurementCentre> centres = new ConcurrentHashMap<>();
    private final Map<UUID, Trader> traders = new ConcurrentHashMap<>();
    private final Map<UUID, Booking> bookings = new ConcurrentHashMap<>();
    private final Map<UUID, Lot> lots = new ConcurrentHashMap<>();
    private final Map<UUID, Bid> bids = new ConcurrentHashMap<>();
    private final Map<UUID, Payment> payments = new ConcurrentHashMap<>();
    private final Map<UUID, Notification> notifications = new ConcurrentHashMap<>();
    private final Map<UUID, CrisisAlert> alerts = new ConcurrentHashMap<>();
    private final Map<UUID, CropPrice> cropPrices = new ConcurrentHashMap<>();
    
    // Relationships and specialized lookup maps
    private final Map<String, UserAuth> usersByUsername = new ConcurrentHashMap<>();
    private final Map<UUID, MandiEntryExit> mandiEntryExitsByBooking = new ConcurrentHashMap<>();
    private final Map<String, Booking> bookingsByQrId = new ConcurrentHashMap<>();
    private final Map<UUID, TokenSequence> tokenSequences = new ConcurrentHashMap<>(); // key is centreId_bookingDate? For simplicity just a string key
    private final Map<String, TokenSequence> tokenSequencesByKey = new ConcurrentHashMap<>();
    private final Map<UUID, List<ProcurementStatusLog>> bookingStatusLogs = new ConcurrentHashMap<>();

    private volatile boolean isReady = false;

    public void clearAll() {
        users.clear();
        farmers.clear();
        centres.clear();
        traders.clear();
        bookings.clear();
        lots.clear();
        bids.clear();
        payments.clear();
        notifications.clear();
        alerts.clear();
        cropPrices.clear();
        usersByUsername.clear();
        mandiEntryExitsByBooking.clear();
        bookingsByQrId.clear();
        tokenSequences.clear();
        tokenSequencesByKey.clear();
        bookingStatusLogs.clear();
        isReady = false;
    }

    public void setReady(boolean ready) {
        this.isReady = ready;
    }

    public boolean isReady() {
        return isReady;
    }

    // -- Users --
    public void saveUser(UserAuth user) {
        users.put(user.getId(), user);
        usersByUsername.put(user.getUsername(), user);
    }
    public UserAuth getUserById(UUID id) { return users.get(id); }
    public UserAuth getUserByUsername(String username) { return usersByUsername.get(username); }
    public List<UserAuth> getAllUsers() { return new ArrayList<>(users.values()); }

    // -- Farmers --
    public void saveFarmer(Farmer farmer) { farmers.put(farmer.getId(), farmer); }
    public Farmer getFarmerById(UUID id) { return farmers.get(id); }
    public List<Farmer> getAllFarmers() { return new ArrayList<>(farmers.values()); }

    // -- Centres --
    public void saveCentre(ProcurementCentre centre) { centres.put(centre.getId(), centre); }
    public ProcurementCentre getCentreById(UUID id) { return centres.get(id); }
    public List<ProcurementCentre> getAllCentres() { return new ArrayList<>(centres.values()); }

    // -- Traders --
    public void saveTrader(Trader trader) { traders.put(trader.getId(), trader); }
    public Trader getTraderById(UUID id) { return traders.get(id); }
    public List<Trader> getAllTraders() { return new ArrayList<>(traders.values()); }

    // -- Bookings --
    public void saveBooking(Booking booking) {
        bookings.put(booking.getId(), booking);
        if (booking.getQrId() != null) {
            bookingsByQrId.put(booking.getQrId(), booking);
        }
    }
    public Booking getBookingById(UUID id) { return bookings.get(id); }
    public Booking getBookingByQrId(String qrId) { return bookingsByQrId.get(qrId); }
    public List<Booking> getAllBookings() { return new ArrayList<>(bookings.values()); }

    // -- Lots --
    public void saveLot(Lot lot) { lots.put(lot.getId(), lot); }
    public Lot getLotById(UUID id) { return lots.get(id); }
    public List<Lot> getAllLots() { return new ArrayList<>(lots.values()); }

    // -- Bids --
    public void saveBid(Bid bid) { bids.put(bid.getId(), bid); }
    public Bid getBidById(UUID id) { return bids.get(id); }
    public List<Bid> getAllBids() { return new ArrayList<>(bids.values()); }

    // -- Payments --
    public void savePayment(Payment payment) { payments.put(payment.getId(), payment); }
    public Payment getPaymentById(UUID id) { return payments.get(id); }
    public List<Payment> getAllPayments() { return new ArrayList<>(payments.values()); }

    // -- Notifications --
    public void saveNotification(Notification notification) { notifications.put(notification.getId(), notification); }
    public List<Notification> getAllNotifications() { return new ArrayList<>(notifications.values()); }

    // -- Alerts --
    public void saveAlert(CrisisAlert alert) { alerts.put(alert.getId(), alert); }
    public List<CrisisAlert> getAllAlerts() { return new ArrayList<>(alerts.values()); }

    // -- Crop Prices --
    public void saveCropPrice(CropPrice price) { cropPrices.put(price.getId(), price); }
    public List<CropPrice> getAllCropPrices() { return new ArrayList<>(cropPrices.values()); }

    // -- Emergency Slots --
    private final Map<UUID, EmergencySlot> emergencySlots = new ConcurrentHashMap<>();
    public void saveEmergencySlot(EmergencySlot slot) { emergencySlots.put(slot.getId(), slot); }
    public List<EmergencySlot> getAllEmergencySlots() { return new ArrayList<>(emergencySlots.values()); }

    // -- Mandi Entry/Exit --
    public void saveMandiEntryExit(MandiEntryExit entryExit) {
        mandiEntryExitsByBooking.put(entryExit.getBooking().getId(), entryExit);
    }
    public MandiEntryExit getMandiEntryExitByBookingId(UUID bookingId) {
        return mandiEntryExitsByBooking.get(bookingId);
    }

    // -- Token Generation (Thread-safe) --
    public synchronized int generateNextToken(UUID centreId, java.time.LocalDate date) {
        String key = centreId.toString() + "_" + date.toString();
        TokenSequence seq = tokenSequencesByKey.computeIfAbsent(key, k -> {
            TokenSequence s = new TokenSequence();
            s.setCentre(getCentreById(centreId));
            s.setBookingDate(date);
            s.setLastToken(0);
            return s;
        });
        seq.setLastToken(seq.getLastToken() + 1);
        return seq.getLastToken();
    }
}
