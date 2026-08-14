package com.wealthos.backend.common.events;

import com.wealthos.backend.alerts.entity.AlertCondition;

import java.math.BigDecimal;
import java.util.UUID;

public record AlertTriggeredEvent(
        UUID userId,
        String symbol,
        AlertCondition condition,
        BigDecimal targetPrice,
        BigDecimal triggerPrice
) implements WealthDomainEvent {
}
