package com.kisanflow.demo;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/demo")
@CrossOrigin(origins = "*")
public class DemoController {

    private final DemoDataLoader dataLoader;

    @Autowired
    public DemoController(DemoDataLoader dataLoader) {
        this.dataLoader = dataLoader;
    }

    @PostMapping("/reset")
    public ResponseEntity<Map<String, String>> resetDemo() {
        try {
            dataLoader.loadData();
            return ResponseEntity.ok(Map.of("status", "SUCCESS", "message", "Demo data reset successfully"));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("status", "ERROR", "message", e.getMessage()));
        }
    }
}
