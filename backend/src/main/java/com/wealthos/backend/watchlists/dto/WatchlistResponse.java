package com.wealthos.backend.watchlists.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record WatchlistResponse(
        UUID id,
        String name,
        List<WatchlistItemResponse> items,
        Instant createdAt
) {
}
