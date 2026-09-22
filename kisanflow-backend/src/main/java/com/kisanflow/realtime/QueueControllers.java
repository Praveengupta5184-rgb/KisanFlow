package com.kisanflow.realtime;

import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.util.*;
import static com.kisanflow.realtime.RealtimeQueueModule.*;
import com.kisanflow.dto.KisanFlowDtos.PersonalQueueResponse;

@RestController @RequestMapping("/api/v1/queue") @CrossOrigin(origins="*") @RequiredArgsConstructor
public class QueueControllers {
 private final QueueService queue;
 @GetMapping("/centres/{centreId}") public QueueState state(@PathVariable UUID centreId){return queue.current(centreId);}
 @PostMapping("/centres/{centreId}/actions") @PreAuthorize("hasRole('OFFICER')") public QueueState action(@PathVariable UUID centreId,@RequestBody OfficerAction action){return queue.officerAction(centreId,action);}
 @GetMapping("/bookings/{bookingId}/eta") @PreAuthorize("hasAnyRole('OFFICER','DISTRICT_OFFICER') or @securityService.isBookingOwner(authentication, #bookingId)") public EtaResponse eta(@PathVariable UUID bookingId,@RequestParam BigDecimal processingSpeed,@RequestParam(defaultValue="1") int activeCounters){return queue.eta(bookingId,processingSpeed,activeCounters);}
 @GetMapping("/bookings/{bookingId}/queue-status") @PreAuthorize("hasAnyRole('OFFICER','DISTRICT_OFFICER') or @securityService.isBookingOwner(authentication, #bookingId)") public PersonalQueueResponse queueStatus(@PathVariable UUID bookingId){return queue.personal(bookingId);}
 @PostMapping("/bookings/{bookingId}/geo-fence-arrival") @PreAuthorize("hasRole('FARMER') and @securityService.isBookingOwner(authentication, #bookingId)") public QueueState geoArrival(@PathVariable UUID bookingId,@RequestBody GeoFenceEvent event){if(distance(event.getFarmerLatitude(),event.getFarmerLongitude(),event.getCentreLatitude(),event.getCentreLongitude())>event.getRadiusMetres())throw new IllegalArgumentException("Farmer is outside the centre geofence");return queue.markArrived(bookingId);}
 private double distance(double a,double b,double c,double d){double x=Math.toRadians(c-a),y=Math.toRadians(d-b),z=Math.sin(x/2)*Math.sin(x/2)+Math.cos(Math.toRadians(a))*Math.cos(Math.toRadians(c))*Math.sin(y/2)*Math.sin(y/2);return 6371000*2*Math.atan2(Math.sqrt(z),Math.sqrt(1-z));}
}

@org.springframework.stereotype.Controller @RequiredArgsConstructor
class QueueStompController {
 private final QueueService queue;
 /** Clients may request a current snapshot by sending {"centreId":"..."} to /app/queue/refresh. */
 @MessageMapping("/queue/refresh") public void refresh(Map<String,String> body){queue.broadcastCurrent(UUID.fromString(body.get("centreId")));}
}
