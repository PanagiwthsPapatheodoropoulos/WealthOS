package com.wealthos.backend.portfolios.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record PortfolioDetailResponse(
        UUID id,
        UUID accountId,
        String name,
        BigDecimal cashBalance,
        BigDecimal holdingsValue,
        BigDecimal totalValue,
        List<PortfolioHoldingResponse> holdings,
        Instant createdAt
) {
}
