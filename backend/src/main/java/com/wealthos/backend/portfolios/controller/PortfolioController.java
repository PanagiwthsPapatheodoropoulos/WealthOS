package com.wealthos.backend.portfolios.controller;

import lombok.RequiredArgsConstructor;
import com.wealthos.backend.common.dto.ApiResponse;
import com.wealthos.backend.common.security.AuthenticatedUser;
import com.wealthos.backend.common.security.CurrentUser;
import com.wealthos.backend.portfolios.dto.CreatePortfolioRequest;
import com.wealthos.backend.portfolios.dto.ImportPositionRequest;
import com.wealthos.backend.portfolios.dto.PortfolioDetailResponse;
import com.wealthos.backend.portfolios.dto.PortfolioSummaryResponse;
import com.wealthos.backend.portfolios.service.PortfolioService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/portfolios")
@RequiredArgsConstructor
public class PortfolioController {

    private final PortfolioService portfolioService;

    

    @GetMapping
    public ApiResponse<List<PortfolioSummaryResponse>> getMyPortfolios(@CurrentUser AuthenticatedUser currentUser) {
        return ApiResponse.ok(portfolioService.getMyPortfolios(currentUser.id()));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<PortfolioSummaryResponse> create(@CurrentUser AuthenticatedUser currentUser,
                                                         @Valid @RequestBody CreatePortfolioRequest request) {
        return ApiResponse.ok(portfolioService.create(currentUser.id(), request), "Portfolio created");
    }

    @GetMapping("/{id}")
    public ApiResponse<PortfolioDetailResponse> getDetail(@CurrentUser AuthenticatedUser currentUser,
                                                           @PathVariable UUID id) {
        return ApiResponse.ok(portfolioService.getDetail(id, currentUser.id()));
    }

    @PostMapping("/{id}/import")
    public ApiResponse<Void> importPositions(@CurrentUser AuthenticatedUser currentUser,
                                             @PathVariable UUID id,
                                             @RequestBody List<ImportPositionRequest> positions) {
        portfolioService.importBrokerHoldings(id, currentUser.id(), positions);
        return ApiResponse.ok(null, "Broker holdings imported successfully");
    }

    @DeleteMapping("/{id}/holdings/{assetId}")
    public ApiResponse<Void> deleteHolding(@CurrentUser AuthenticatedUser currentUser,
                                           @PathVariable UUID id,
                                           @PathVariable UUID assetId) {
        portfolioService.deleteHolding(id, currentUser.id(), assetId);
        return ApiResponse.ok(null, "Holding removed successfully");
    }

    @DeleteMapping("/{id}/assets/{symbol}")
    public ApiResponse<Void> deleteHoldingBySymbol(@CurrentUser AuthenticatedUser currentUser,
                                                   @PathVariable UUID id,
                                                   @PathVariable String symbol) {
        portfolioService.deleteHoldingBySymbol(id, currentUser.id(), symbol);
        return ApiResponse.ok(null, "Holding removed successfully");
    }

    @PostMapping("/{id}/clear")
    public ApiResponse<Void> clearHoldings(@CurrentUser AuthenticatedUser currentUser,
                                           @PathVariable UUID id) {
        portfolioService.clearHoldings(id, currentUser.id());
        return ApiResponse.ok(null, "Holdings cleared successfully");
    }

    @PostMapping("/reset-clean")
    public ApiResponse<Void> resetClean(@CurrentUser AuthenticatedUser currentUser) {
        portfolioService.resetAllForUser(currentUser.id());
        return ApiResponse.ok(null, "Account reset successfully");
    }
}
