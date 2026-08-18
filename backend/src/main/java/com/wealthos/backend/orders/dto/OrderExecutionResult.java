package com.wealthos.backend.orders.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public sealed interface OrderExecutionResult permits OrderExecutionResult.Filled, OrderExecutionResult.Skipped, OrderExecutionResult.Failed {
    UUID orderId();

    record Filled(UUID orderId, BigDecimal executionPrice, Instant executedAt) implements OrderExecutionResult {}
    record Skipped(UUID orderId, String reason) implements OrderExecutionResult {}
    record Failed(UUID orderId, String errorMessage) implements OrderExecutionResult {}
}
