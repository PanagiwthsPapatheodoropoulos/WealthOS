package com.wealthos.backend.market.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record MarketPriceMessage(
        String symbol,
        BigDecimal price,
        Instant timestamp
) {
}
