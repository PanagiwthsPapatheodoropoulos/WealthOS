package com.wealthos.backend.market.kafka;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import com.wealthos.backend.market.dto.MarketPriceMessage;
import com.wealthos.backend.market.service.RollingStatsService;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class MarketTickAnalyticsConsumer {

    private final RollingStatsService rollingStatsService;

    @KafkaListener(topics = "market-ticks", groupId = "wealthos-market-analytics")
    public void consumeTick(java.util.Map<String, Object> event) {
        try {
            if (event != null && event.get("symbol") != null && event.get("price") != null) {
                String symbol = event.get("symbol").toString();
                java.math.BigDecimal price = new java.math.BigDecimal(event.get("price").toString());
                rollingStatsService.recordPrice(symbol, price);
            }
        } catch (Exception e) {
            log.error("Error processing market tick for analytics: {}", event, e);
        }
    }
}
