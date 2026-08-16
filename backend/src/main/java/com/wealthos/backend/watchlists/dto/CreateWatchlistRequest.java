package com.wealthos.backend.watchlists.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateWatchlistRequest(
        @NotBlank(message = "Name is required")
        String name
) {
}
