package com.wealthos.backend.market.service;

import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RollingStatsService {

    private final Map<String, BigDecimal> latestPrices = new ConcurrentHashMap<>();

    public void recordPrice(String symbol, BigDecimal price) {
        if (symbol != null && price != null) {
            latestPrices.put(symbol, price);
        }
    }

    public BigDecimal getLatestPrice(String symbol) {
        return latestPrices.get(symbol);
    }
}
