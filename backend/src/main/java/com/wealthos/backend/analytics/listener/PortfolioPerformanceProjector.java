package com.wealthos.backend.analytics.listener;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import com.wealthos.backend.analytics.entity.PortfolioPerformanceSnapshot;
import com.wealthos.backend.analytics.repository.PortfolioPerformanceSnapshotRepository;
import com.wealthos.backend.common.config.RabbitMqConfig;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class PortfolioPerformanceProjector {

    private final PortfolioPerformanceSnapshotRepository snapshotRepository;

    @RabbitListener(queues = RabbitMqConfig.PORTFOLIO_PROJECTION_QUEUE)
    public void handlePortfolioProjection(Map<String, Object> payload) {
        try {
            UUID portfolioId = UUID.fromString((String) payload.get("portfolioId"));
            BigDecimal totalValue = new BigDecimal(payload.getOrDefault("totalValue", "0").toString());
            BigDecimal dailyPnl = new BigDecimal(payload.getOrDefault("dailyPnl", "0").toString());
            BigDecimal dailyPnlPct = new BigDecimal(payload.getOrDefault("dailyPnlPercentage", "0").toString());

            PortfolioPerformanceSnapshot snapshot = PortfolioPerformanceSnapshot.builder()
                    .portfolioId(portfolioId)
                    .snapshotDate(LocalDate.now())
                    .totalValue(totalValue)
                    .dailyPnl(dailyPnl)
                    .dailyPnlPercentage(dailyPnlPct)
                    .build();

            snapshotRepository.save(snapshot);
        } catch (Exception e) {
            log.error("Failed to project portfolio performance: {}", payload, e);
        }
    }
}
