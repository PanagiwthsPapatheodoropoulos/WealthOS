package com.wealthos.backend.auth.service;

import com.wealthos.backend.users.enums.Role;
import lombok.RequiredArgsConstructor;
import com.wealthos.backend.accounts.entity.Account;
import com.wealthos.backend.accounts.service.AccountService;
import com.wealthos.backend.auth.dto.AuthResponse;
import com.wealthos.backend.auth.dto.LoginRequest;
import com.wealthos.backend.auth.dto.RefreshRequest;
import com.wealthos.backend.auth.dto.RegisterRequest;
import com.wealthos.backend.auth.entity.RefreshToken;
import com.wealthos.backend.auth.repository.RefreshTokenRepository;
import com.wealthos.backend.common.exception.ConflictException;
import com.wealthos.backend.common.exception.UnauthorizedException;
import com.wealthos.backend.common.security.JwtService;
import com.wealthos.backend.common.security.JwtProperties;
import com.wealthos.backend.portfolios.service.PortfolioService;
import com.wealthos.backend.users.entity.User;
import com.wealthos.backend.users.mapper.UserMapper;
import com.wealthos.backend.users.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final JwtProperties jwtProperties;
    private final UserMapper userMapper;
    private final AccountService accountService;
    private final PortfolioService portfolioService;

    

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new ConflictException("An account with this email already exists");
        }

        User user = User.builder()
                .email(request.email())
                .passwordHash(passwordEncoder.encode(request.password()))
                .firstName(request.firstName())
                .lastName(request.lastName())
                .role(Role.USER)
                .active(true)
                .build();

        user = userRepository.save(user);

        Account defaultAccount = accountService.createDefaultCashAccount(user);
        portfolioService.createDefaultPortfolio(defaultAccount);

        return issueTokens(user);
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new UnauthorizedException("Invalid email or password"));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new UnauthorizedException("Invalid email or password");
        }

        if (!user.isActive()) {
            throw new UnauthorizedException("This account has been deactivated");
        }

        return issueTokens(user);
    }

    @Transactional
    public AuthResponse refresh(RefreshRequest request) {
        String tokenHash = hash(request.refreshToken());

        RefreshToken storedToken = refreshTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new UnauthorizedException("Invalid refresh token"));

        if (!storedToken.isActive()) {
            throw new UnauthorizedException("Refresh token expired or revoked");
        }

        User user = storedToken.getUser();

        storedToken.setRevoked(true);
        refreshTokenRepository.save(storedToken);

        return issueTokens(user);
    }

    @Transactional
    public void logout(UUID userId) {
        refreshTokenRepository.revokeAllForUser(userId);
    }

    private AuthResponse issueTokens(User user) {
        String accessToken = jwtService.generateAccessToken(user.getId(), user.getEmail(), user.getRole().name());
        String rawRefreshToken = generateRawRefreshToken();

        RefreshToken refreshToken = RefreshToken.builder()
                .user(user)
                .tokenHash(hash(rawRefreshToken))
                .expiresAt(Instant.now().plus(jwtProperties.refreshTokenTtlDays(), ChronoUnit.DAYS))
                .build();

        refreshTokenRepository.save(refreshToken);

        return new AuthResponse(
                accessToken,
                rawRefreshToken,
                jwtProperties.accessTokenTtlMinutes() * 60,
                userMapper.toResponse(user)
        );
    }

    private String generateRawRefreshToken() {
        return UUID.randomUUID().toString() + UUID.randomUUID();
    }

    private String hash(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(value.getBytes());
            return Base64.getEncoder().encodeToString(hashBytes);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 algorithm not available", e);
        }
    }
}
