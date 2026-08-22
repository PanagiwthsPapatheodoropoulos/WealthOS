package com.wealthos.backend.market.provider;

import java.math.BigDecimal;
import java.util.Optional;

public sealed interface MarketDataProvider permits AlphaVantageMarketDataProvider, MockMarketDataProvider {
    Optional<BigDecimal> fetchLatestPrice(String symbol);
}
