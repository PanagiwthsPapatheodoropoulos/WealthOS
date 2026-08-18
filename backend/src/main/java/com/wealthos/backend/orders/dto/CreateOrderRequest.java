package com.wealthos.backend.orders.dto;

import com.wealthos.backend.orders.entity.OrderType;
import com.wealthos.backend.transactions.entity.TransactionType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

public record CreateOrderRequest(
        @NotNull(message = "Portfolio ID is required")
        UUID portfolioId,

        @NotNull(message = "Asset ID is required")
        UUID assetId,

        @NotNull(message = "Order type is required")
        OrderType type,

        @NotNull(message = "Action is required")
        TransactionType action,

        @NotNull(message = "Quantity is required")
        @DecimalMin(value = "0.000001", message = "Quantity must be greater than zero")
        BigDecimal quantity,

        @NotNull(message = "Target price is required")
        @DecimalMin(value = "0.000001", message = "Target price must be greater than zero")
        BigDecimal targetPrice
) {
}
