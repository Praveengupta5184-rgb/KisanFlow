package com.kisanflow;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;

@SpringBootApplication
@org.springframework.data.jpa.repository.config.EnableJpaRepositories(considerNestedRepositories = true)
@EnableMethodSecurity
@EnableScheduling
@EnableAsync
public class KisanFlowApplication {
    public static void main(String[] args) { SpringApplication.run(KisanFlowApplication.class, args); }
}
