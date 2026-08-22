package com.wealthos.backend.market.scheduler;

import com.wealthos.backend.assets.repository.AssetRepository;
import com.wealthos.backend.market.kafka.MarketPriceProducer;
import com.wealthos.backend.market.provider.MarketDataProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class MarketDataSyncScheduler {

    private final AssetRepository assetRepository;
    private final MarketDataProvider marketDataProvider;
    private final MarketPriceProducer marketPriceProducer;

    @Scheduled(fixedDelay = 60_000)
    public void syncPrices() {
        assetRepository.findAll().forEach(asset ->
                marketDataProvider.fetchLatestPrice(asset.getSymbol()).ifPresent(price -> {
                    marketPriceProducer.publishTick(asset.getSymbol(), price);
                    log.debug("Synced {} -> {}", asset.getSymbol(), price);
                })
        );
    }
}
