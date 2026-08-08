package com.wealthos.backend.assets.dto;

import com.wealthos.backend.assets.entity.AssetType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record CreateAssetRequest(
        @NotBlank(message = "Symbol is required")
        String symbol,

        @NotBlank(message = "Name is required")
        String name,

        @NotNull(message = "Asset type is required")
        AssetType assetType,

        @NotBlank(message = "Currency is required")
        String currency,

        @NotNull(message = "Current price is required")
        @DecimalMin(value = "0.0", message = "Current price cannot be negative")
        BigDecimal currentPrice
) {
}
