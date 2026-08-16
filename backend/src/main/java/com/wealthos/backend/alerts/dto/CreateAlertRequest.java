package com.wealthos.backend.alerts.dto;

import com.wealthos.backend.alerts.entity.AlertCondition;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

public record CreateAlertRequest(
        UUID assetId,               // optional now
        String symbol,              // used when assetId is null
        String name,
        String assetType,
        String currency,
        BigDecimal currentPrice,

        @NotNull(message = "Condition is required")
        AlertCondition condition,

        @NotNull(message = "Target price is required")
        @DecimalMin(value = "0.0", inclusive = false, message = "Target price must be greater than zero")
        BigDecimal targetPrice
) {
}
