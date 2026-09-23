package com.kisanflow.realtime;

import com.kisanflow.demo.InMemoryDemoStore;
import com.kisanflow.entity.KisanFlowEntities.Booking;
import com.kisanflow.service.KisanFlowServices.BookingStateChanged;
import com.kisanflow.entity.KisanFlowEntities.ProcurementCentre;
import lombok.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.event.EventListener;
import com.kisanflow.realtime.RealtimeEventPublisher;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.locks.*;
import com.kisanflow.dto.KisanFlowDtos.PersonalQueueResponse;

public final class RealtimeQueueModule {
    private RealtimeQueueModule() {}
    private static final Set<String> QUEUED=Set.of("token_generated","arrived","weighing","quality_check","procurement","payment_processing");
    
    @Data @NoArgsConstructor @AllArgsConstructor @Builder 
    public static class QueueState {
        private UUID centreId;
        private String currentServingToken;
        private List<String> nextUpTokens;
        private int processedCount,pendingCount,activeCounters,activeFarmerCount,totalActiveTokens;
        private OffsetDateTime updatedAt;
    }
    
    @Data @NoArgsConstructor @AllArgsConstructor @Builder 
    public static class OfficerAction {
        private String action;
        private Integer activeCounters;
    }
    
    @Data @NoArgsConstructor @AllArgsConstructor @Builder 
    public static class GeoFenceEvent {
        private UUID farmerId;
        private double farmerLatitude,farmerLongitude,centreLatitude,centreLongitude,radiusMetres;
    }
    
    @Data @NoArgsConstructor @AllArgsConstructor @Builder 
    public static class EtaResponse {
        private String token;
        private int queuePosition;
        private int estimatedWaitMinutes;
    }

    @Service @RequiredArgsConstructor 
    public static class QueueService {
        private final InMemoryDemoStore store;
        private final RealtimeEventPublisher publisher; 
        private final ConcurrentMap<UUID,Lock> locks=new ConcurrentHashMap<>();
        @Value("${app.queue.silent-turn-minutes:30}") private int silentThreshold;

        @EventListener
        public void onBookingStateChanged(BookingStateChanged event) {
            try {
                broadcastAll(event.centreId(), event.bookingId(), event.status());
                publisher.publishFarmerEvent(
                    event.farmerId(),
                    "/status",
                    "TOKEN_UPDATED",
                    personal(event.bookingId())
                );
            } catch (Exception e) {}
        }

        public QueueState officerAction(UUID centreId, OfficerAction request){
            Lock lock=locks.computeIfAbsent(centreId,k->new ReentrantLock());
            lock.lock();
            try{
                List<Booking> list = store.getAllBookings().stream()
                    .filter(b -> b.getCentre().getId().equals(centreId) && !b.getBookingDate().isBefore(LocalDate.now().minusDays(7)) && !b.getBookingDate().isAfter(LocalDate.now()) && QUEUED.contains(b.getStatus()))
                    .sorted(Comparator.comparing(Booking::getTokenNumber))
                    .toList();
                
                if(list.isEmpty()) return publish(state(centreId,list,request.getActiveCounters()));
                
                Booking current = list.get(0);
                String action = request.getAction().toLowerCase(Locale.ROOT);
                if(!Set.of("served","skipped","no-show").contains(action)) throw new IllegalArgumentException("action must be served, skipped, or no-show");
                
                current.setStatus("served".equals(action)?"payment_processing":"no_show");
                store.saveBooking(current);
                
                list = store.getAllBookings().stream()
                    .filter(b -> b.getCentre().getId().equals(centreId) && !b.getBookingDate().isBefore(LocalDate.now().minusDays(7)) && !b.getBookingDate().isAfter(LocalDate.now()) && QUEUED.contains(b.getStatus()))
                    .sorted(Comparator.comparing(Booking::getTokenNumber))
                    .toList();
                    
                QueueState result = publish(state(centreId,list,request.getActiveCounters()));
                publisher.publishFarmerEvent(current.getFarmer().getId(),"/status","STAGE_UPDATED",Map.of("bookingId",current.getId(),"token",token(current),"status",current.getStatus()));
                notifyNearTurn(list,result);
                return result;
            }finally{
                lock.unlock();
            }
        }
        
        public QueueState markArrived(UUID bookingId){
            Booking b = store.getBookingById(bookingId);
            if (b == null) throw new NoSuchElementException("Booking not found");
            if(!"token_generated".equals(b.getStatus()))throw new IllegalStateException("Only a generated token can arrive");
            b.setStatus("arrived");
            store.saveBooking(b);
            return current(b.getCentre().getId());
        }
        
        public QueueState current(UUID centreId){
            List<Booking> list = store.getAllBookings().stream()
                .filter(b -> b.getCentre().getId().equals(centreId) && !b.getBookingDate().isBefore(LocalDate.now().minusDays(7)) && !b.getBookingDate().isAfter(LocalDate.now()) && QUEUED.contains(b.getStatus()))
                .sorted(Comparator.comparing(Booking::getTokenNumber))
                .toList();
            return state(centreId, list, null);
        }
        
        public QueueState broadcastCurrent(UUID centreId){
            return publish(current(centreId));
        }
        
        public PersonalQueueResponse personal(UUID bookingId){
            Booking booking = store.getBookingById(bookingId);
            if (booking == null) throw new NoSuchElementException("Booking not found");
            
            List<Booking> active = store.getAllBookings().stream()
                .filter(b -> b.getCentre().getId().equals(booking.getCentre().getId()) && !b.getBookingDate().isBefore(LocalDate.now().minusDays(7)) && !b.getBookingDate().isAfter(LocalDate.now()) && QUEUED.contains(b.getStatus()))
                .sorted(Comparator.comparing(Booking::getTokenNumber))
                .toList();
                
            int position = -1; 
            for(int i=0;i<active.size();i++){if(active.get(i).getId().equals(bookingId)){position=i;break;}}
            
            int counters = Math.max(1, Optional.ofNullable(booking.getCentre().getStaffCount()).orElse(1));
            BigDecimal speed = Optional.ofNullable(booking.getCentre().getProcessingSpeed()).orElse(BigDecimal.ZERO);
            int eta = speed.signum()>0 ? (int)Math.ceil(Math.max(position,0)*60.0/(speed.doubleValue()*counters)) : 0;
            int farmers = (int)active.stream().map(b->b.getFarmer().getId()).distinct().count();
            
            return PersonalQueueResponse.builder().bookingId(bookingId).centreId(booking.getCentre().getId()).token(token(booking)).status(booking.getStatus()).currentServingToken(active.isEmpty()?null:token(active.get(0))).queuePosition(position<0?0:position+1).farmersAhead(position<0?0:position).totalActiveFarmers(farmers).estimatedWaitMinutes(eta).updatedAt(OffsetDateTime.now()).currentCounter(booking.getCurrentCounter()).nextCounter(booking.getNextCounter()).nextProcess(booking.getNextProcess()).officerInstruction(booking.getOfficerInstruction()).build();
        }
        
        public void broadcastAll(UUID centreId, UUID changedBookingId, String status){
            List<Booking> active = store.getAllBookings().stream()
                .filter(b -> b.getCentre().getId().equals(centreId) && !b.getBookingDate().isBefore(LocalDate.now().minusDays(7)) && !b.getBookingDate().isAfter(LocalDate.now()) && QUEUED.contains(b.getStatus()))
                .sorted(Comparator.comparing(Booking::getTokenNumber))
                .toList();
                
            publish(state(centreId,active,null));
            active.forEach(booking -> publisher.publishFarmerEvent(booking.getFarmer().getId(),"/queue","QUEUE_UPDATED", personal(booking.getId())));
            
            if(!QUEUED.contains(status)) {
                Booking changed = store.getBookingById(changedBookingId);
                if (changed != null) {
                    publisher.publishFarmerEvent(changed.getFarmer().getId(),"/queue","QUEUE_UPDATED", personal(changedBookingId));
                }
            }
        }
        
        public EtaResponse eta(UUID bookingId,BigDecimal processingSpeed,int activeCounters){
            Booking b = store.getBookingById(bookingId);
            if (b == null) throw new NoSuchElementException("Booking not found");
            
            List<Booking> list = store.getAllBookings().stream()
                .filter(x -> x.getCentre().getId().equals(b.getCentre().getId()) && !x.getBookingDate().isBefore(LocalDate.now().minusDays(7)) && !x.getBookingDate().isAfter(LocalDate.now()) && QUEUED.contains(x.getStatus()))
                .sorted(Comparator.comparing(Booking::getTokenNumber))
                .toList();
                
            int pos = Math.max(0,java.util.stream.IntStream.range(0,list.size()).filter(i->list.get(i).getId().equals(bookingId)).findFirst().orElse(0));
            int mins = (int)Math.ceil(pos*60/(Math.max(processingSpeed.doubleValue(),.1)*Math.max(activeCounters,1)));
            return EtaResponse.builder().token(token(b)).queuePosition(pos).estimatedWaitMinutes(mins).build();
        }

        private QueueState state(UUID centreId,List<Booking> list,Integer counters){
            int active = counters==null?1:Math.max(1,counters);
            int farmerCount = (int)list.stream().map(b->b.getFarmer().getId()).distinct().count();
            return QueueState.builder().centreId(centreId).currentServingToken(list.isEmpty()?null:token(list.get(0))).nextUpTokens(list.stream().skip(1).limit(5).map(this::token).toList()).processedCount(0).pendingCount(list.size()).activeCounters(active).activeFarmerCount(farmerCount).totalActiveTokens(list.size()).updatedAt(OffsetDateTime.now()).build();
        }
        
        private QueueState publish(QueueState state){
            publisher.publishCentreEvent(state.getCentreId(),"/queue","QUEUE_UPDATED",state);
            return state;
        }
        
        private void notifyNearTurn(List<Booking> list,QueueState s){
            for(int i=0;i<list.size();i++){
                int eta = i*60/Math.max(s.getActiveCounters(),1);
                if(eta<=silentThreshold) publisher.publishFarmerEvent(list.get(i).getFarmer().getId(),"/notification","TURN_APPROACHING",Map.of("token",token(list.get(i)),"estimatedWaitMinutes",eta));
            }
        }
        
        private String token(Booking b){return "A"+(100+b.getTokenNumber());}
    }
}
