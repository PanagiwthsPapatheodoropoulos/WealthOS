package com.wealthos.backend.analytics.dto;

import lombok.Builder;

import java.math.BigDecimal;

@Builder
public record AssetVolatilityResponse(
        String symbol,
        BigDecimal dailyVolatility,
        BigDecimal annualizedVolatility
) {
}
