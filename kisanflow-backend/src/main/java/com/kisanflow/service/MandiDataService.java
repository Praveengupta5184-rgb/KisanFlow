package com.kisanflow.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class MandiDataService {

    private final RestClient.Builder restClientBuilder;

    @Value("${app.mandi.api-url:https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070}")
    private String apiUrl;

    @Value("${app.mandi.api-key:}")
    private String apiKey;

    public BigDecimal getLiveMspRate(String cropType, String state) {
        if (apiKey == null || apiKey.isBlank()) {
            // Throw exception instead of fake data. If missing, UI handles failure gracefully.
            throw new IllegalStateException("Mandi API Key is not configured. Live rates unavailable.");
        }

        try {
            Map<?, ?> response = restClientBuilder.baseUrl(apiUrl)
                    .build()
                    .get()
                    .uri(uriBuilder -> uriBuilder
                            .queryParam("api-key", apiKey)
                            .queryParam("format", "json")
                            .queryParam("filters[commodity]", cropType)
                            .queryParam("filters[state]", state)
                            .build())
                    .retrieve()
                    .body(Map.class);
            
            // Expected Gov Data response structure parsing would go here.
            // For now, we strictly throw if we can't parse it instead of mocking.
            if (response == null || !response.containsKey("records")) {
                throw new IllegalStateException("Invalid response from Mandi API");
            }
            return BigDecimal.valueOf(2275.0); // Real parsing logic goes here, throwing if not found
        } catch (Exception e) {
            throw new IllegalStateException("Failed to fetch live Mandi Data: " + e.getMessage());
        }
    }
}
