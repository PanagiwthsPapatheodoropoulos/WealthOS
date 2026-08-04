package com.wealthos.backend.users.dto;

import com.wealthos.backend.users.enums.Role;

import java.time.Instant;
import java.util.UUID;

public record UserResponseDto(
        UUID id,
        String email,
        String firstName,
        String lastName,
        Role role,
        boolean isActive,
        Instant createdAt
) {}
