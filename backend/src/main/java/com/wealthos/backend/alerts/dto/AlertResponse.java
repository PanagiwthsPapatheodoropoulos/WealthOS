package com.wealthos.backend.alerts.dto;

import com.wealthos.backend.alerts.entity.AlertCondition;
import com.wealthos.backend.alerts.entity.AlertStatus;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Builder
public record AlertResponse(
        UUID id,
        UUID assetId,
        String symbol,
        AlertCondition condition,
        BigDecimal targetPrice,
        AlertStatus status,
        Instant createdAt,
        Instant triggeredAt
) {
}
