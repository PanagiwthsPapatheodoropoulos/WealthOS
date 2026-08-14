package com.wealthos.backend.common.events;

import java.util.UUID;

public sealed interface WealthDomainEvent permits TransactionExecutedEvent, AlertTriggeredEvent, OrderExecutedEvent {
    UUID userId();
}
