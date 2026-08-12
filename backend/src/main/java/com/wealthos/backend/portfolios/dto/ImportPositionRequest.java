package com.wealthos.backend.portfolios.dto;

import java.math.BigDecimal;

public record ImportPositionRequest(
        String symbol,
        String name,
        BigDecimal quantity,
        BigDecimal averagePrice,
        BigDecimal currentPrice
) {}
