package com.wealthos.backend.analytics.dto;

import java.math.BigDecimal;

public record AssetAllocationResponse(
        String assetType,
        BigDecimal value,
        BigDecimal percentage
) {
}
