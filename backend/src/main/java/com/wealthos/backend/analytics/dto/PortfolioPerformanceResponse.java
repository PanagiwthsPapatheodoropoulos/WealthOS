package com.wealthos.backend.analytics.dto;

import lombok.Builder;

import java.math.BigDecimal;
import java.time.LocalDate;

@Builder
public record PortfolioPerformanceResponse(
        LocalDate date,
        BigDecimal totalValue,
        BigDecimal dailyPnl,
        BigDecimal dailyPnlPercentage
) {
}
