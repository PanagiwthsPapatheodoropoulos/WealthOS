package com.wealthos.backend.portfolios.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record PortfolioSummaryResponse(
        UUID id,
        UUID accountId,
        String name,
        BigDecimal totalValue,
        Instant createdAt
) {
}
