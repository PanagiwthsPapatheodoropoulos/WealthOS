package com.wealthos.backend.analytics.service;

import lombok.RequiredArgsConstructor;
import com.wealthos.backend.analytics.dto.AssetAllocationResponse;
import com.wealthos.backend.analytics.dto.PortfolioPerformanceResponse;
import com.wealthos.backend.analytics.repository.PortfolioPerformanceSnapshotRepository;
import com.wealthos.backend.portfolios.service.PortfolioService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.wealthos.backend.analytics.entity.PortfolioPerformanceSnapshot;
import com.wealthos.backend.portfolios.entity.Portfolio;
import com.wealthos.backend.portfolios.entity.PortfolioAsset;
import com.wealthos.backend.portfolios.repository.PortfolioAssetRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private final PortfolioService portfolioService;
    private final PortfolioPerformanceSnapshotRepository portfolioPerformanceSnapshotRepository;
    private final PortfolioAssetRepository portfolioAssetRepository;

    @Transactional(readOnly = true)
    public PortfolioPerformanceResponse getPortfolioPerformance(UUID portfolioId, UUID userId) {
        Portfolio portfolio = portfolioService.getEntityByIdAndUser(portfolioId, userId);

        return portfolioPerformanceSnapshotRepository.findById(portfolioId)
                .map(s -> PortfolioPerformanceResponse.builder()
                        .date(s.getSnapshotDate())
                        .totalValue(s.getTotalValue())
                        .dailyPnl(s.getDailyPnl())
                        .dailyPnlPercentage(s.getDailyPnlPercentage())
                        .build())
                .orElseGet(() -> {
                    List<PortfolioAsset> holdings = portfolioAssetRepository.findByPortfolioId(portfolio.getId());
                    BigDecimal liveHoldings = holdings.stream()
                            .map(h -> {
                                BigDecimal p = h.getAsset().getCurrentPrice() != null ? h.getAsset().getCurrentPrice() : BigDecimal.ZERO;
                                return h.getQuantity().multiply(p);
                            })
                            .reduce(BigDecimal.ZERO, BigDecimal::add);

                    BigDecimal cash = portfolio.getAccount() != null && portfolio.getAccount().getCashBalance() != null
                            ? portfolio.getAccount().getCashBalance()
                            : BigDecimal.ZERO;

                    BigDecimal total = liveHoldings.add(cash);
                    return PortfolioPerformanceResponse.builder()
                            .date(LocalDate.now())
                            .totalValue(total)
                            .dailyPnl(BigDecimal.ZERO)
                            .dailyPnlPercentage(BigDecimal.ZERO)
                            .build();
                });
    }

    @Transactional(readOnly = true)
    public List<AssetAllocationResponse> getAssetAllocation(UUID portfolioId, UUID userId) {
        Portfolio portfolio = portfolioService.getEntityByIdAndUser(portfolioId, userId);
        List<PortfolioAsset> holdings = portfolioAssetRepository.findByPortfolioId(portfolio.getId());

        Map<String, BigDecimal> allocationMap = new HashMap<>();
        BigDecimal totalValue = BigDecimal.ZERO;

        // Group holdings by asset type
        for (PortfolioAsset holding : holdings) {
            String typeName = holding.getAsset().getAssetType() != null
                    ? holding.getAsset().getAssetType().name()
                    : "OTHER";
            BigDecimal assetPrice = holding.getAsset().getCurrentPrice() != null
                    ? holding.getAsset().getCurrentPrice()
                    : BigDecimal.ZERO;
            BigDecimal value = holding.getQuantity().multiply(assetPrice);
            allocationMap.merge(typeName, value, BigDecimal::add);
            totalValue = totalValue.add(value);
        }

        // Add cash balance
        BigDecimal cash = portfolio.getAccount() != null && portfolio.getAccount().getCashBalance() != null
                ? portfolio.getAccount().getCashBalance()
                : BigDecimal.ZERO;
        if (cash.compareTo(BigDecimal.ZERO) > 0) {
            allocationMap.merge("CASH", cash, BigDecimal::add);
            totalValue = totalValue.add(cash);
        }

        if (totalValue.compareTo(BigDecimal.ZERO) == 0) {
            return List.of();
        }

        final BigDecimal finalTotal = totalValue;
        List<AssetAllocationResponse> result = new ArrayList<>();
        for (Map.Entry<String, BigDecimal> entry : allocationMap.entrySet()) {
            BigDecimal pct = entry.getValue()
                    .multiply(BigDecimal.valueOf(100))
                    .divide(finalTotal, 2, RoundingMode.HALF_UP);
            result.add(new AssetAllocationResponse(entry.getKey(), entry.getValue(), pct));
        }

        return result;
    }

    @Transactional
    public void recordDailySnapshot(Portfolio portfolio) {
        List<PortfolioAsset> holdings = portfolioAssetRepository.findByPortfolioId(portfolio.getId());
        BigDecimal liveHoldings = holdings.stream()
                .map(h -> {
                    BigDecimal p = h.getAsset().getCurrentPrice() != null ? h.getAsset().getCurrentPrice() : BigDecimal.ZERO;
                    return h.getQuantity().multiply(p);
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal cash = portfolio.getAccount() != null && portfolio.getAccount().getCashBalance() != null
                ? portfolio.getAccount().getCashBalance()
                : BigDecimal.ZERO;

        BigDecimal total = liveHoldings.add(cash);

        // Previous snapshot for daily PnL
        BigDecimal prevTotal = portfolioPerformanceSnapshotRepository.findById(portfolio.getId())
                .map(PortfolioPerformanceSnapshot::getTotalValue)
                .orElse(total);

        BigDecimal dailyPnl = total.subtract(prevTotal);
        BigDecimal dailyPnlPct = prevTotal.compareTo(BigDecimal.ZERO) > 0
                ? dailyPnl.multiply(BigDecimal.valueOf(100)).divide(prevTotal, 4, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        PortfolioPerformanceSnapshot snapshot = PortfolioPerformanceSnapshot.builder()
                .portfolioId(portfolio.getId())
                .snapshotDate(LocalDate.now())
                .totalValue(total)
                .dailyPnl(dailyPnl)
                .dailyPnlPercentage(dailyPnlPct)
                .build();

        portfolioPerformanceSnapshotRepository.save(snapshot);
    }
}
