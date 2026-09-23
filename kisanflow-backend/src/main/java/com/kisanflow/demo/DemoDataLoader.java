package com.kisanflow.demo;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kisanflow.entity.KisanFlowEntities.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Component
public class DemoDataLoader implements ApplicationRunner {

    private final InMemoryDemoStore store;
    private final ObjectMapper objectMapper;
    private final PasswordEncoder encoder;

    @Autowired
    public DemoDataLoader(InMemoryDemoStore store, ObjectMapper objectMapper, PasswordEncoder encoder) {
        this.store = store;
        this.objectMapper = objectMapper;
        this.encoder = encoder;
    }

    @Override
    public void run(ApplicationArguments args) throws Exception {
        loadData();
    }

    public void loadData() throws Exception {
        store.clearAll();
        System.out.println("Loading demo data into InMemoryDemoStore...");
        
        try (InputStream is = new ClassPathResource("demo/data.json").getInputStream()) {
            JsonNode root = objectMapper.readTree(is);
            
            // Load Centres
            for (JsonNode node : root.path("centres")) {
                ProcurementCentre centre = ProcurementCentre.builder()
                    .id(UUID.fromString(node.get("id").asText()))
                    .name(node.get("name").asText())
                    .district(node.get("district").asText())
                    .state(node.get("state").asText())
                    .capacity(node.get("capacity").asInt())
                    .latitude(BigDecimal.valueOf(node.get("latitude").asDouble()))
                    .longitude(BigDecimal.valueOf(node.get("longitude").asDouble()))
                    .currentLoad(node.get("currentLoad").asInt())
                    .processingSpeed(BigDecimal.valueOf(node.get("processingSpeed").asDouble()))
                    .staffCount(node.get("staffCount").asInt())
                    .createdAt(OffsetDateTime.now())
                    .build();
                store.saveCentre(centre);
            }
            
            // Load Farmers & Auth
            for (JsonNode node : root.path("farmers")) {
                Farmer farmer = Farmer.builder()
                    .id(UUID.fromString(node.get("id").asText()))
                    .name(node.get("name").asText())
                    .mobileNumber(node.get("mobileNumber").asText())
                    .village(node.get("village").asText())
                    .preferredLanguage(node.get("preferredLanguage").asText())
                    .cropType(node.get("cropType").asText())
                    .createdAt(OffsetDateTime.now())
                    .build();
                store.saveFarmer(farmer);
                
                UserAuth userAuth = UserAuth.builder()
                    .id(UUID.randomUUID())
                    .username(farmer.getMobileNumber())
                    .passwordHash(encoder.encode("otp-only-" + farmer.getMobileNumber()))
                    .role(Role.FARMER)
                    .linkedFarmer(farmer)
                    .createdAt(OffsetDateTime.now())
                    .build();
                store.saveUser(userAuth);
            }
        } catch (Exception e) {
            System.err.println("Failed to load demo/data.json: " + e.getMessage());
        }

        // Create Demo Officer and Trader
        UUID mainCentreId = UUID.fromString("f47ac10b-58cc-4372-a567-0e02b2c3d479");
        ProcurementCentre mainCentre = store.getCentreById(mainCentreId);
        
        if (mainCentre != null) {
            // Officer
            UserAuth officer = UserAuth.builder()
                .id(UUID.randomUUID())
                .username("officer_kapurthala")
                .passwordHash(encoder.encode("KapurthalaOfficer@123"))
                .role(Role.OFFICER)
                .linkedCentreId(mainCentreId)
                .createdAt(OffsetDateTime.now())
                .updatedAt(OffsetDateTime.now())
                .build();
            store.saveUser(officer);
            
            // District Manager
            UserAuth manager = UserAuth.builder()
                .id(UUID.randomUUID())
                .username("district_manager")
                .passwordHash(encoder.encode("DistrictManager@123"))
                .role(Role.DISTRICT_OFFICER)
                .createdAt(OffsetDateTime.now())
                .updatedAt(OffsetDateTime.now())
                .build();
            store.saveUser(manager);

            // Trader
            Trader t = Trader.builder()
                .id(UUID.randomUUID())
                .name("Demo Trader")
                .mobileNumber("9876543211")
                .licenseNumber("TRD-12345")
                .linkedCentre(mainCentre)
                .createdAt(OffsetDateTime.now())
                .updatedAt(OffsetDateTime.now())
                .build();
            store.saveTrader(t);

            UserAuth traderUser = UserAuth.builder()
                .id(UUID.randomUUID())
                .username("demo_trader")
                .passwordHash(encoder.encode("Trader@123"))
                .role(Role.TRADER)
                .traderId(t.getId())
                .linkedCentreId(mainCentreId)
                .createdAt(OffsetDateTime.now())
                .updatedAt(OffsetDateTime.now())
                .build();
            store.saveUser(traderUser);
        }

        // We can just log that CSV prices are read by some other service or we can store them here.
        // If needed, the CropPriceService can read from the same CSV.
        
        store.setReady(true);
        System.out.println("Demo data loaded successfully.");
    }
}
