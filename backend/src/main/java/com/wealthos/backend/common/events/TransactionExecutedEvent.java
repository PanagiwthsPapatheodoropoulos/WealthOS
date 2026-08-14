package com.wealthos.backend.common.events;

import com.wealthos.backend.transactions.entity.TransactionType;

import java.math.BigDecimal;
import java.util.UUID;

public record TransactionExecutedEvent(
        UUID userId,
        String symbol,
        TransactionType type,
        BigDecimal quantity,
        BigDecimal totalAmount
) implements WealthDomainEvent {
}
