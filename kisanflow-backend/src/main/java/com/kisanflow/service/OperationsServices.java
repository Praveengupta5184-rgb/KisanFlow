package com.kisanflow.service;

import com.kisanflow.demo.InMemoryDemoStore;
import com.kisanflow.dto.KisanFlowDtos.*;
import com.kisanflow.entity.KisanFlowEntities.*;
import com.kisanflow.realtime.RealtimeEventPublisher;
import lombok.RequiredArgsConstructor; 
import org.springframework.stereotype.Service; 

import java.time.*; 
import java.util.*; 

public final class OperationsServices { 
    private OperationsServices() {}
    
    static <T> T required(T value, String type, UUID id) { 
        if (value == null) throw new IllegalArgumentException(type + " not found: " + id);
        return value; 
    }

    @Service @RequiredArgsConstructor 
    public static class PaymentService { 
        private final InMemoryDemoStore store;
        private final RealtimeEventPublisher publisher;
        
        public PaymentResponse getTraderPaymentRequirement(UUID traderId, UUID lotId) {
            Payment p = store.getAllPayments().stream()
                .filter(pay -> pay.getLot() != null && pay.getLot().getId().equals(lotId) && pay.getTrader() != null && pay.getTrader().getId().equals(traderId))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("No payment requirement found for this lot and trader"));
            return map(p);
        }

        public PaymentResponse initiateOnline(InitiatePaymentRequest r) {
            Lot lot = required(store.getLotById(r.getLotId()), "Lot", r.getLotId());
            Trader trader = required(store.getTraderById(r.getTraderId()), "Trader", r.getTraderId());
            Booking b = lot.getBooking();

            Payment p = store.getAllPayments().stream()
                .filter(pay -> lot.getId().equals(pay.getLot() != null ? pay.getLot().getId() : null) && "PAYMENT_REQUIRED".equals(pay.getStatus()))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("No PAYMENT_REQUIRED pending payment found for this lot"));
            
            if (!trader.getId().equals(p.getTrader().getId())) {
                throw new IllegalStateException("Trader does not match the winning trader");
            }

            p.setPaymentMethod(r.getPaymentMethod());
            p.setPaymentType(r.getPaymentType());
            p.setStatus("PROCESSING"); 
            p.setTransactionId("KFPAY-" + LocalDate.now().toString().replace("-", "") + "-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase());
            p.setInitiatedAt(OffsetDateTime.now());
            p.setUpdatedAt(OffsetDateTime.now());
            store.savePayment(p);

            PaymentResponse res = map(p);
            publisher.publishTraderEvent(trader.getId(), "/payments", "PAYMENT_PROCESSING", res);
            return res;
        }

        public PaymentResponse completeOnline(UUID paymentId, UUID traderId) {
            Payment p = required(store.getPaymentById(paymentId), "Payment", paymentId);
            if (!"PROCESSING".equals(p.getStatus())) throw new IllegalStateException("Payment not in PROCESSING state");
            if (!p.getTrader().getId().equals(traderId)) throw new IllegalStateException("Unauthorized");

            p.setStatus("SUCCESS");
            p.setProcessedAt(OffsetDateTime.now());
            p.setUpdatedAt(OffsetDateTime.now());
            store.savePayment(p);

            PaymentResponse res = map(p);
            notifyAll(p.getBooking(), p, res); // Notifies farmer, trader and officer
            return res;
        }

        public PaymentResponse submitOffline(OfflinePaymentRequest r) {
            Payment p = required(store.getPaymentById(r.getPaymentId()), "Payment", r.getPaymentId());
            if (!"PAYMENT_REQUIRED".equals(p.getStatus())) throw new IllegalStateException("Payment not in PAYMENT_REQUIRED state");
            
            p.setPaymentMethod("OFFLINE");
            p.setOfflineReference(r.getOfflineReference());
            p.setRemarks(r.getRemarks());
            p.setStatus("FARMER_PENDING_CONFIRMATION");
            p.setInitiatedAt(OffsetDateTime.now());
            p.setUpdatedAt(OffsetDateTime.now());
            store.savePayment(p);

            PaymentResponse res = map(p);
            notifyAll(p.getBooking(), p, res);
            return res;
        }

        public PaymentResponse farmerConfirm(PaymentActionRequest r) {
            Payment p = required(store.getPaymentById(r.getPaymentId()), "Payment", r.getPaymentId());
            if (!"FARMER_PENDING_CONFIRMATION".equals(p.getStatus())) throw new IllegalStateException("Payment not waiting for farmer confirmation");
            
            p.setFarmerConfirmation(r.isConfirmed());
            p.setFarmerConfirmedAt(OffsetDateTime.now());
            if (r.isConfirmed()) {
                p.setStatus("OFFICER_PENDING_VERIFICATION");
            } else {
                p.setStatus("FARMER_REJECTED");
                p.setRemarks((p.getRemarks() == null ? "" : p.getRemarks() + " | ") + "Rejected by farmer: " + r.getRemarks());
            }
            p.setUpdatedAt(OffsetDateTime.now());
            store.savePayment(p);

            PaymentResponse res = map(p);
            notifyAll(p.getBooking(), p, res);
            return res;
        }

        public PaymentResponse officerVerify(PaymentActionRequest r) {
            Payment p = required(store.getPaymentById(r.getPaymentId()), "Payment", r.getPaymentId());
            if (!"OFFICER_PENDING_VERIFICATION".equals(p.getStatus()) && !"SUCCESS".equals(p.getStatus())) {
                throw new IllegalStateException("Payment not waiting for officer verification");
            }
            
            p.setOfficerVerifiedAt(OffsetDateTime.now());
            if (r.isConfirmed()) {
                p.setStatus("VERIFIED_SUCCESS");
                p.setRemarks((p.getRemarks() == null ? "" : p.getRemarks() + " | ") + "Officer Verified");
            } else {
                p.setStatus("OFFICER_REJECTED");
                p.setRemarks((p.getRemarks() == null ? "" : p.getRemarks() + " | ") + "Rejected by officer: " + r.getRemarks());
            }
            p.setUpdatedAt(OffsetDateTime.now());
            store.savePayment(p);

            PaymentResponse res = map(p);
            notifyAll(p.getBooking(), p, res);
            return res;
        }

        // Keep a generic record or initiate method for tests/initial flow if needed
        public PaymentResponse record(PaymentRequest r){ 
            Booking b = required(store.getBookingById(r.getBookingId()), "Booking", r.getBookingId()); 
            Payment p = store.getAllPayments().stream()
                .filter(pay -> pay.getBooking().getId().equals(b.getId()))
                .findFirst()
                .orElseGet(() -> Payment.builder().id(UUID.randomUUID()).booking(b).createdAt(OffsetDateTime.now()).build());
                
            p.setAmount(r.getAmount());
            p.setStatus(r.getStatus());
            p.setExpectedDate(r.getExpectedDate());
            p.setActualDate(r.getActualDate());
            p.setDelayFlag(r.getActualDate()!=null && r.getActualDate().isAfter(r.getExpectedDate()));
            p.setUpdatedAt(OffsetDateTime.now());
            store.savePayment(p);

            PaymentResponse res = map(p);
            notifyAll(b, p, res);
            return res; 
        }

        public PaymentResponse getPayment(UUID paymentId) {
            return map(required(store.getPaymentById(paymentId), "Payment", paymentId));
        }

        public List<PaymentResponse> getPaymentsByTrader(UUID traderId) {
            return store.getAllPayments().stream().filter(p -> p.getTrader() != null && p.getTrader().getId().equals(traderId)).map(this::map).toList();
        }

        public List<PaymentResponse> getPaymentsByFarmer(UUID farmerId) {
            return store.getAllPayments().stream().filter(p -> p.getBooking().getFarmer().getId().equals(farmerId)).map(this::map).toList();
        }

        public List<PaymentResponse> getPendingVerification() {
            return store.getAllPayments().stream().filter(p -> "OFFLINE_PENDING_OFFICER_VERIFICATION".equals(p.getStatus())).map(this::map).toList();
        }
        
        public List<PaymentResponse> overdue(){
            return store.getAllPayments().stream()
                .filter(p -> (List.of("pending","processing").contains(p.getStatus())) && p.getExpectedDate() != null && p.getExpectedDate().isBefore(LocalDate.now()))
                .map(this::map).toList();
        } 
        
        private void notifyAll(Booking b, Payment p, PaymentResponse res) {
            publisher.publishFarmerEvent(b.getFarmer().getId(), "/payment", "PAYMENT_UPDATED", res);
            if (p.getTrader() != null) {
                publisher.publishTraderEvent(p.getTrader().getId(), "/payment", "PAYMENT_UPDATED", res);
            }
            publisher.publishCentreEvent(b.getCentre().getId(), "/payments", "PAYMENT_UPDATED", res);
        }

        private PaymentResponse map(Payment p){
            return PaymentResponse.builder().id(p.getId()).bookingId(p.getBooking().getId())
                .traderId(p.getTrader() != null ? p.getTrader().getId() : null)
                .lotId(p.getLot() != null ? p.getLot().getId() : null)
                .amount(p.getAmount()).status(p.getStatus())
                .paymentMethod(p.getPaymentMethod()).paymentType(p.getPaymentType())
                .transactionId(p.getTransactionId()).offlineReference(p.getOfflineReference())
                .remarks(p.getRemarks()).proofUrl(p.getProofUrl())
                .farmerConfirmation(p.getFarmerConfirmation()).delayFlag(p.getDelayFlag())
                .expectedDate(p.getExpectedDate()).actualDate(p.getActualDate())
                .initiatedAt(p.getInitiatedAt()).processedAt(p.getProcessedAt())
                .farmerConfirmedAt(p.getFarmerConfirmedAt()).officerVerifiedAt(p.getOfficerVerifiedAt())
                .createdAt(p.getCreatedAt()).updatedAt(p.getUpdatedAt())
                .build();
        }
    }
    
    @Service @RequiredArgsConstructor 
    public static class AlertService { 
        private final InMemoryDemoStore store;
        
        public AlertResponse create(AlertRequest r){
            ProcurementCentre c = required(store.getCentreById(r.getCentreId()),"Centre",r.getCentreId());
            CrisisAlert alert = CrisisAlert.builder()
                .id(UUID.randomUUID()).centre(c)
                .alertType(r.getAlertType()).severity(r.getSeverity())
                .message(r.getMessage()).suggestedAction(r.getSuggestedAction())
                .status("active").createdAt(OffsetDateTime.now()).build();
            store.saveAlert(alert);
            return map(alert);
        }
        
        public List<AlertResponse> active(){
            return store.getAllAlerts().stream()
                .filter(a -> List.of("active","acknowledged").contains(a.getStatus()))
                .sorted(Comparator.comparing(CrisisAlert::getCreatedAt).reversed())
                .map(this::map).toList();
        } 
        
        public AlertResponse resolve(UUID id){
            CrisisAlert a = store.getAllAlerts().stream().filter(x -> x.getId().equals(id)).findFirst().orElseThrow();
            a.setStatus("resolved");
            a.setResolvedAt(OffsetDateTime.now());
            store.saveAlert(a);
            return map(a);
        }
        
        public UUID anomaly(AnomalyRequest r){
            Booking b = r.getRelatedBookingId() == null ? null : required(store.getBookingById(r.getRelatedBookingId()),"Booking",r.getRelatedBookingId());
            // Since anomaly flags are rarely queried individually in the demo, we can just log or store in a list in the demo store.
            // For now, returning a fake UUID as we might not need to query it back.
            return UUID.randomUUID();
        } 
        
        private AlertResponse map(CrisisAlert a){
            return AlertResponse.builder().id(a.getId()).centreId(a.getCentre().getId()).alertType(a.getAlertType()).severity(a.getSeverity()).message(a.getMessage()).suggestedAction(a.getSuggestedAction()).status(a.getStatus()).createdAt(a.getCreatedAt()).build();
        }
    }
    
    @Service @RequiredArgsConstructor 
    public static class NotificationService {
        private final InMemoryDemoStore store;
        
        public UUID trigger(NotificationRequest r){
            Farmer f = required(store.getFarmerById(r.getFarmerId()),"Farmer",r.getFarmerId());
            Notification n = Notification.builder()
                .id(UUID.randomUUID()).farmer(f)
                .channel(r.getChannel()).message(r.getMessage())
                .status("queued").createdAt(OffsetDateTime.now()).build();
            store.saveNotification(n);
            return n.getId();
        }
    }
    
    @Service @RequiredArgsConstructor 
    public static class DigitalDnaService {
        private final InMemoryDemoStore store;
        
        public CentreStatsResponse get(UUID id){
            return CentreStatsResponse.builder().centreId(id).build();
        }
    }
}
