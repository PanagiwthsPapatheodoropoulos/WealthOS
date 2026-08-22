package com.wealthos.backend.market.provider;

import lombok.RequiredArgsConstructor;
import com.wealthos.backend.assets.repository.AssetRepository;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Optional;
import java.util.concurrent.ThreadLocalRandom;

@Component
@ConditionalOnProperty(name = "wealthos.market.provider", havingValue = "mock", matchIfMissing = true)
@RequiredArgsConstructor
public final class MockMarketDataProvider implements MarketDataProvider {

    private final AssetRepository assetRepository;

    

    @Override
    public Optional<BigDecimal> fetchLatestPrice(String symbol) {
        return assetRepository.findBySymbolIgnoreCase(symbol).map(asset -> {
            double pctChange = ThreadLocalRandom.current().nextDouble(-0.02, 0.02);
            BigDecimal factor = BigDecimal.valueOf(1 + pctChange);
            return asset.getCurrentPrice().multiply(factor).setScale(6, RoundingMode.HALF_UP);
        });
    }
}
