package com.wealthos.backend.market.provider;

import lombok.RequiredArgsConstructor;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.util.Optional;

@Component
@ConditionalOnProperty(name = "wealthos.market.provider", havingValue = "alphavantage")
@Slf4j
@RequiredArgsConstructor
public final class AlphaVantageMarketDataProvider implements MarketDataProvider {

    private final RestClient restClient;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${wealthos.market.alpha-vantage.api-key:demo}")
    private String apiKey;

    

    @Override
    @CircuitBreaker(name = "marketDataApi", fallbackMethod = "fetchLatestPriceFallback")
    @Retry(name = "marketDataApi")
    public Optional<BigDecimal> fetchLatestPrice(String symbol) {
        String body = restClient.get()
                .uri("/query?function=GLOBAL_QUOTE&symbol={symbol}&apikey={key}", symbol, apiKey)
                .retrieve()
                .body(String.class);

        try {
            JsonNode root = objectMapper.readTree(body);
            JsonNode priceNode = root.path("Global Quote").path("05. price");
            if (priceNode.isMissingNode() || priceNode.asText().isBlank()) {
                return Optional.empty();
            }
            return Optional.of(new BigDecimal(priceNode.asText()));
        } catch (Exception e) {
            log.warn("Failed to parse Alpha Vantage response for {}: {}", symbol, e.getMessage());
            return Optional.empty();
        }
    }

    public Optional<BigDecimal> fetchLatestPriceFallback(String symbol, Throwable t) {
        log.warn("Alpha Vantage circuit open for {} — skipping this cycle. Cause: {}", symbol, t.getMessage());
        return Optional.empty();
    }
}
