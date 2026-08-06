package com.wealthos.backend.common.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Date;
import java.util.Map;
import java.util.UUID;

@Service
public class JwtService {

    private final JwtProperties jwtProperties;
    private final SecretKey key;

    public JwtService(JwtProperties jwtProperties) {
        this.jwtProperties = jwtProperties;
        String rawSecret = jwtProperties.secret();
        if (rawSecret == null || rawSecret.isBlank()) {
            throw new IllegalStateException(
                "wealthos.jwt.secret is not set. Configure JWT_SECRET as an environment variable — refusing to start with an insecure default secret."
            );
        }

        byte[] keyBytes;
        try {
            keyBytes = Decoders.BASE64.decode(rawSecret);
        } catch (Exception e1) {
            try {
                keyBytes = Decoders.BASE64URL.decode(rawSecret);
            } catch (Exception e2) {
                keyBytes = rawSecret.getBytes(StandardCharsets.UTF_8);
            }
        }

        if (keyBytes.length < 32) {
            try {
                MessageDigest sha256 = MessageDigest.getInstance("SHA-256");
                keyBytes = sha256.digest(keyBytes);
            } catch (Exception ignored) {
            }
        }

        this.key = Keys.hmacShaKeyFor(keyBytes);
    }

    public long getAccessTokenExpirationMs() {
        long minutes = jwtProperties.accessTokenTtlMinutes() > 0 ? jwtProperties.accessTokenTtlMinutes() : 15;
        return minutes * 60 * 1000;
    }

    public long getRefreshTokenExpirationMs() {
        long days = jwtProperties.refreshTokenTtlDays() > 0 ? jwtProperties.refreshTokenTtlDays() : 7;
        return days * 24 * 60 * 60 * 1000;
    }

    public String generateAccessToken(UUID userId, String email, String role) {
        return buildToken(Map.of("email", email, "role", role), userId.toString(), getAccessTokenExpirationMs());
    }

    private String buildToken(Map<String, Object> extraClaims, String subject, long expirationMs) {
        return Jwts.builder()
                .claims(extraClaims)
                .subject(subject)
                .issuedAt(new Date(System.currentTimeMillis()))
                .expiration(new Date(System.currentTimeMillis() + expirationMs))
                .signWith(key)
                .compact();
    }

    public Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public UUID extractUserId(String token) {
        return UUID.fromString(extractAllClaims(token).getSubject());
    }

    public String extractEmail(String token) {
        return extractAllClaims(token).get("email", String.class);
    }

    public String extractRole(String token) {
        return extractAllClaims(token).get("role", String.class);
    }

    public boolean isValid(String token) {
        return isTokenValid(token);
    }

    public boolean isTokenValid(String token) {
        try {
            return !isTokenExpired(token);
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    public boolean isTokenExpired(String token) {
        return extractAllClaims(token).getExpiration().before(new Date());
    }
}
