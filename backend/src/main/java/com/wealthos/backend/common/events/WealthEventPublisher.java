package com.wealthos.backend.common.events;

import lombok.RequiredArgsConstructor;
import com.wealthos.backend.common.config.RabbitMqConfig;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class WealthEventPublisher {

    private final RabbitTemplate rabbitTemplate;

    public void publishTransactionCompleted(Object event) {
        rabbitTemplate.convertAndSend(RabbitMqConfig.EXCHANGE_NAME, RabbitMqConfig.TRANSACTION_ROUTING_KEY, event);
    }

    public void publishTransactionExecuted(UUID userId, String symbol, Object type, BigDecimal quantity, BigDecimal price) {
        Map<String, Object> event = Map.of(
                "userId", userId != null ? userId.toString() : "",
                "symbol", symbol != null ? symbol : "",
                "type", type != null ? type.toString() : "",
                "quantity", quantity != null ? quantity : BigDecimal.ZERO,
                "price", price != null ? price : BigDecimal.ZERO
        );
        publishTransactionCompleted(event);
    }

    public void publishNotification(Object event) {
        rabbitTemplate.convertAndSend(RabbitMqConfig.EXCHANGE_NAME, RabbitMqConfig.NOTIFICATION_ROUTING_KEY, event);
    }

    public void publishAlertTriggered(Object event) {
        rabbitTemplate.convertAndSend(RabbitMqConfig.EXCHANGE_NAME, "alert.triggered", event);
    }

    public void publishPortfolioProjection(Object event) {
        rabbitTemplate.convertAndSend(RabbitMqConfig.EXCHANGE_NAME, "portfolio.projection", event);
    }
}
