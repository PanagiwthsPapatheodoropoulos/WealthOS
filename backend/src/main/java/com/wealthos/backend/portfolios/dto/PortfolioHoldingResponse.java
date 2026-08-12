package com.wealthos.backend.portfolios.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record PortfolioHoldingResponse(
        UUID assetId,
        String symbol,
        String name,
        BigDecimal quantity,
        BigDecimal avgCost,
        BigDecimal currentPrice,
        BigDecimal marketValue,
        BigDecimal unrealizedPnl
) {
}
