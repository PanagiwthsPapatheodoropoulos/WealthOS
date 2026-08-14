package com.wealthos.backend.common.events;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record OrderExecutedEvent(
        UUID orderId,
        UUID userId,
        UUID portfolioId,
        String symbol,
        String action,
        BigDecimal quantity,
        BigDecimal price,
        Instant occurredAt
) implements WealthDomainEvent {
}
