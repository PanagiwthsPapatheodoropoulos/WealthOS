package com.wealthos.backend.accounts.dto;

import com.wealthos.backend.accounts.entity.AccountType;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record AccountResponse(
        UUID id,
        String name,
        AccountType accountType,
        String currency,
        BigDecimal cashBalance,
        Instant createdAt
) {
}
