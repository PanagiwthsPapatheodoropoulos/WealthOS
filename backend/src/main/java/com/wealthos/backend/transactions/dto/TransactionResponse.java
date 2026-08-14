package com.wealthos.backend.transactions.dto;

import com.wealthos.backend.transactions.entity.TransactionType;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Builder
public record TransactionResponse(
        UUID id,
        UUID portfolioId,
        UUID assetId,
        String symbol,
        TransactionType type,
        BigDecimal quantity,
        BigDecimal price,
        BigDecimal totalAmount,
        BigDecimal realizedPnl,
        Instant executedAt
) {
}
