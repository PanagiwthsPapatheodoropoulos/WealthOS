package com.wealthos.backend.transactions.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

public record BuyRequest(
        @NotNull(message = "Portfolio id is required")
        UUID portfolioId,

        @NotNull(message = "Asset id is required")
        UUID assetId,

        @NotNull(message = "Quantity is required")
        @DecimalMin(value = "0.000001", message = "Quantity must be greater than zero")
        BigDecimal quantity
) implements TradeOperation {
}
