package com.wealthos.backend.assets.dto;

import com.wealthos.backend.assets.entity.AssetType;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record AssetResponse(
        UUID id,
        String symbol,
        String name,
        AssetType assetType,
        String currency,
        BigDecimal currentPrice,
        Instant priceUpdatedAt
) {
}
