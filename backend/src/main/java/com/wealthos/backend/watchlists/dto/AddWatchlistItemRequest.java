package com.wealthos.backend.watchlists.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record AddWatchlistItemRequest(
        UUID assetId,
        String symbol,
        String name,
        String assetType,
        String currency,
        BigDecimal currentPrice
) {
    public AddWatchlistItemRequest(UUID assetId) {
        this(assetId, null, null, null, null, null);
    }
}
