package com.wealthos.backend.transactions.dto;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record TransactionEventResponse(UUID id, String eventType, Map<String, Object> payload, Instant occurredAt) {
}
