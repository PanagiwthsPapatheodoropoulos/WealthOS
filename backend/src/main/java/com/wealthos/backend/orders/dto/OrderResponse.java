package com.wealthos.backend.orders.dto;

import com.wealthos.backend.orders.entity.OrderStatus;
import com.wealthos.backend.orders.entity.OrderType;
import com.wealthos.backend.transactions.entity.TransactionType;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Builder
public record OrderResponse(
        UUID id,
        UUID portfolioId,
        UUID assetId,
        String symbol,
        OrderType type,
        TransactionType action,
        BigDecimal quantity,
        BigDecimal targetPrice,
        OrderStatus status,
        Instant createdAt,
        Instant filledAt
) {
}
