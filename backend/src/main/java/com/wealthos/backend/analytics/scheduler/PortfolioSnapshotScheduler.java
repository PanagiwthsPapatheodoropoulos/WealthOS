package com.wealthos.backend.analytics.scheduler;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import com.wealthos.backend.analytics.service.AnalyticsService;
import com.wealthos.backend.portfolios.entity.Portfolio;
import com.wealthos.backend.portfolios.repository.PortfolioRepository;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@Slf4j
@RequiredArgsConstructor
public class PortfolioSnapshotScheduler {

    private final PortfolioRepository portfolioRepository;
    private final AnalyticsService analyticsService;

    /**
     * Executes daily at midnight (00:00 UTC) to capture End-Of-Day portfolio performance snapshots.
     */
    @Scheduled(cron = "0 0 0 * * *")
    @org.springframework.transaction.annotation.Transactional
    public void captureDailySnapshots() {
        log.info("Starting scheduled EOD portfolio performance snapshot job...");
        List<Portfolio> portfolios = portfolioRepository.findAll();
        int count = 0;
        for (Portfolio p : portfolios) {
            try {
                analyticsService.recordDailySnapshot(p);
                count++;
            } catch (Exception e) {
                log.error("Failed to capture snapshot for portfolio {}: {}", p.getId(), e.getMessage());
            }
        }
        log.info("EOD snapshot job completed successfully. Captured {} portfolio snapshots.", count);
    }

    /**
     * Runs once on startup to ensure all active portfolios have an initial baseline snapshot.
     */
    @EventListener(ApplicationReadyEvent.class)
    public void onStartupCapture() {
        log.info("Initializing baseline portfolio performance snapshots on startup...");
        captureDailySnapshots();
    }
}
