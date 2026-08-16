package com.wealthos.backend.watchlists.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record WatchlistItemResponse(
        UUID assetId,
        String symbol,
        String name,
        BigDecimal currentPrice
) {
}
