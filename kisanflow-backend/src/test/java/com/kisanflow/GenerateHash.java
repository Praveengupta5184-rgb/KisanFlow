package com.kisanflow;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class GenerateHash {
    public static void main(String[] args) {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        System.out.println("District manager hash: " + encoder.encode("DistrictManager@123"));
        System.out.println("Kapurthala officer hash: " + encoder.encode("KapurthalaOfficer@123"));
        System.out.println("Patiala officer hash: " + encoder.encode("PatialaOfficer@123"));
        System.out.println("Match Kapurthala? " + encoder.matches("KapurthalaOfficer@123", "$2b$12$ONnCeAuoLqyYQiCdlcBHgu03ief8O6fVt3vACjEYssjFwyKP5T0YS"));
        System.out.println("Match Patiala? " + encoder.matches("PatialaOfficer@123", "$2a$10$slYQmyNdGzin7olVeolvkunY14FuN9wBPVkl5ExPVVEBPsX2KLCS"));
    }
}
