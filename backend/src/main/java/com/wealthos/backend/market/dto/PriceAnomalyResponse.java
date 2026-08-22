package com.wealthos.backend.market.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record PriceAnomalyResponse(UUID id, UUID assetId, String symbol, BigDecimal price, BigDecimal zScore, Instant detectedAt) {
}
