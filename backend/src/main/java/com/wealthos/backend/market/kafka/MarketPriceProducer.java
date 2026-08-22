package com.wealthos.backend.market.kafka;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class MarketPriceProducer {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public void publishTick(String symbol, BigDecimal price) {
        Map<String, Object> event = Map.of(
                "symbol", symbol,
                "price", price,
                "timestamp", System.currentTimeMillis()
        );
        log.debug("Publishing market tick to Kafka: {} -> {}", symbol, price);
        kafkaTemplate.send("market-ticks", symbol, event);
    }
}
