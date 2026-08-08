package com.wealthos.backend.assets.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record UpdateAssetPriceRequest(
        @NotNull(message = "Current price is required")
        @DecimalMin(value = "0.0", message = "Current price cannot be negative")
        BigDecimal currentPrice
) {
}
