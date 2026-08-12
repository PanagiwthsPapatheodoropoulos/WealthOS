package com.wealthos.backend.portfolios.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record CreatePortfolioRequest(
        @NotNull(message = "Account id is required")
        UUID accountId,

        @NotBlank(message = "Name is required")
        String name
) {
}
