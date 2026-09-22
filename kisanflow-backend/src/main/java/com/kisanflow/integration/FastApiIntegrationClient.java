package com.kisanflow.integration;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;
import java.time.Duration;
import java.util.*;

/** Non-blocking gateway. Every remote failure is converted to a documented fallback. */
@Service @Slf4j
public class FastApiIntegrationClient {
 private final WebClient ai; private final WebClient simulation;
 public FastApiIntegrationClient(WebClient.Builder builder,@Value("${app.ai.base-url}")String aiUrl,@Value("${app.simulation.base-url}")String simulationUrl){this.ai=builder.baseUrl(aiUrl).build();this.simulation=builder.baseUrl(simulationUrl).build();}
 public Mono<Map<String,Object>> bottleneck(Map<String,Object> request){return post(ai,"/api/v1/bottleneck",request,Map.of("bottleneckStage","unknown","averageStageMinutes",Map.of(),"explanation","AI service unavailable; using database metrics."));}
 public Mono<Map<String,Object>> paymentDelay(Map<String,Object> request){return post(ai,"/api/v1/payment-delay",request,Map.of("delayProbability",0.0,"delayFlag",false,"expectedDelayWindowHours","unknown","explanation","AI service unavailable."));}
 public Mono<Map<String,Object>> waitTime(Map<String,Object> request){return post(ai,"/api/v1/wait-time",request,Map.of("predictedWaitMinutes",0.0,"confidenceScore",0.0,"explanation",List.of("AI service unavailable.")));}
 public Mono<Map<String,Object>> bestCentre(Map<String,Object> request){return post(ai,"/api/v1/best-centre",request,Map.of("rankedCentres",List.of()));}
 public Mono<Map<String,Object>> chat(Map<String,Object> request){return post(ai,"/api/v1/voice-query",request,Map.of("reply","मुझे खेद है, अभी जवाब देने में असमर्थ हूँ (AI Service Offline)।","source","offline"));}
 public Mono<Map<String,Object>> simulate(Map<String,Object> request){return post(simulation,"/api/v1/simulate",request,Map.of("scenarioType",request.getOrDefault("scenarioType","unknown"),"centreImpacts",List.of(),"summary","Simulation service unavailable."));}
 @SuppressWarnings("unchecked") private Mono<Map<String,Object>> post(WebClient client,String path,Map<String,Object> payload,Map<String,Object> fallback){try{return client.post().uri(path).contentType(MediaType.APPLICATION_JSON).bodyValue(payload).retrieve().bodyToMono(Map.class).cast((Class<Map<String,Object>>)(Class<?>)Map.class).timeout(Duration.ofSeconds(6)).doOnError(e->log.warn("FastAPI call {} failed; returning fallback: {}",path,e.toString())).onErrorReturn(fallback);}catch(RuntimeException e){log.error("FastAPI request construction failed for {}; returning fallback",path,e);return Mono.just(fallback);}}
}
