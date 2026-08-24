package com.wealthos.backend.auth.service;

import com.wealthos.backend.auth.repository.RefreshTokenRepository;
import com.wealthos.backend.common.security.JwtProperties;
import com.wealthos.backend.common.security.JwtService;
import com.wealthos.backend.users.mapper.UserMapper;
import com.wealthos.backend.users.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private RefreshTokenRepository refreshTokenRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtService jwtService;
    @Mock private JwtProperties jwtProperties;
    @Mock private UserMapper userMapper;

    @InjectMocks private AuthService authService;

    @Test
    void serviceLoads() {
        assertThat(authService).isNotNull();
    }
}
