package com.wealthos.backend.common.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class JwtServiceTest {

    private JwtService jwtService;

    @BeforeEach
    void setUp() {
        JwtProperties properties = new JwtProperties("404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970", 15, 7);
        jwtService = new JwtService(properties);
    }

    @Test
    void generateAndValidateToken() {
        UUID userId = UUID.randomUUID();
        String token = jwtService.generateAccessToken(userId, "test@wealthos.dev", "USER");

        assertThat(token).isNotBlank();
        assertThat(jwtService.isTokenValid(token)).isTrue();
        assertThat(jwtService.extractUserId(token)).isEqualTo(userId);
        assertThat(jwtService.extractEmail(token)).isEqualTo("test@wealthos.dev");
        assertThat(jwtService.extractRole(token)).isEqualTo("USER");
    }
}
