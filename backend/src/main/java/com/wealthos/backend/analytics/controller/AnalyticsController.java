package com.wealthos.backend.analytics.controller;

import lombok.RequiredArgsConstructor;
import com.wealthos.backend.analytics.dto.AssetAllocationResponse;
import com.wealthos.backend.analytics.dto.PortfolioPerformanceResponse;
import com.wealthos.backend.analytics.service.AnalyticsService;
import com.wealthos.backend.common.dto.ApiResponse;
import com.wealthos.backend.common.security.AuthenticatedUser;
import com.wealthos.backend.common.security.CurrentUser;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping({"/api/portfolios/{portfolioId}/analytics", "/api/analytics/portfolios/{portfolioId}", "/api/v1/portfolios/{portfolioId}/analytics", "/api/v1/analytics/portfolios/{portfolioId}"})
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    @GetMapping("/performance")
    public ApiResponse<PortfolioPerformanceResponse> getPerformance(
            @PathVariable UUID portfolioId,
            @CurrentUser AuthenticatedUser currentUser) {
        return ApiResponse.ok(analyticsService.getPortfolioPerformance(portfolioId, currentUser.id()));
    }

    @GetMapping("/allocation")
    public ApiResponse<List<AssetAllocationResponse>> getAllocation(
            @PathVariable UUID portfolioId,
            @CurrentUser AuthenticatedUser currentUser) {
        return ApiResponse.ok(analyticsService.getAssetAllocation(portfolioId, currentUser.id()));
    }
}
