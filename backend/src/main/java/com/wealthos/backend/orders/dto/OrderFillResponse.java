package com.wealthos.backend.orders.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record OrderFillResponse(BigDecimal fillQuantity, BigDecimal fillPrice, BigDecimal slippageBps, Instant filledAt) {}
