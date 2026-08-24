package com.wealthos.backend.analytics.service;

import com.wealthos.backend.analytics.dto.PortfolioPerformanceResponse;
import com.wealthos.backend.analytics.entity.PortfolioPerformanceSnapshot;
import com.wealthos.backend.analytics.repository.PortfolioPerformanceSnapshotRepository;
import com.wealthos.backend.portfolios.service.PortfolioService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AnalyticsServiceTest {

    @Mock private PortfolioService portfolioService;
    @Mock private PortfolioPerformanceSnapshotRepository snapshotRepository;

    @InjectMocks private AnalyticsService analyticsService;

    @Test
    void getPortfolioPerformance_returnsSnapshot_whenPresent() {
        UUID portfolioId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        PortfolioPerformanceSnapshot snapshot = PortfolioPerformanceSnapshot.builder()
                .portfolioId(portfolioId)
                .snapshotDate(LocalDate.now())
                .totalValue(BigDecimal.valueOf(10000))
                .dailyPnl(BigDecimal.valueOf(150))
                .dailyPnlPercentage(BigDecimal.valueOf(1.5))
                .build();

        when(snapshotRepository.findById(portfolioId)).thenReturn(Optional.of(snapshot));

        PortfolioPerformanceResponse response = analyticsService.getPortfolioPerformance(portfolioId, userId);

        assertThat(response).isNotNull();
        assertThat(response.totalValue()).isEqualByComparingTo(BigDecimal.valueOf(10000));
        assertThat(response.dailyPnl()).isEqualByComparingTo(BigDecimal.valueOf(150));
    }
}
