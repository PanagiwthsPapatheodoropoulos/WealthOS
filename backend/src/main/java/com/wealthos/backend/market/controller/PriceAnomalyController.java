package com.wealthos.backend.market.controller;

import lombok.RequiredArgsConstructor;
import com.wealthos.backend.common.dto.ApiResponse;
import com.wealthos.backend.market.dto.PriceAnomalyResponse;
import com.wealthos.backend.market.service.PriceAnomalyService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/market/anomalies")
@RequiredArgsConstructor
public class PriceAnomalyController {

    private final PriceAnomalyService priceAnomalyService;

    @GetMapping("/{assetId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<List<PriceAnomalyResponse>> getRecent(@PathVariable UUID assetId) {
        return ApiResponse.ok(priceAnomalyService.getRecentAnomalies(assetId));
    }
}
