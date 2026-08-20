package com.wealthos.backend.notifications.listener;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import com.wealthos.backend.common.config.RabbitMqConfig;
import com.wealthos.backend.notifications.entity.Notification;
import com.wealthos.backend.notifications.entity.NotificationType;
import com.wealthos.backend.notifications.service.NotificationService;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationListener {

    private final NotificationService notificationService;

    @RabbitListener(queues = RabbitMqConfig.NOTIFICATION_QUEUE)
    public void handleNotificationMessage(Map<String, Object> payload) {
        try {
            UUID userId = UUID.fromString((String) payload.get("userId"));
            String title = (String) payload.get("title");
            String message = (String) payload.get("message");
            String typeStr = (String) payload.getOrDefault("type", "GENERAL");
            NotificationType type = NotificationType.valueOf(typeStr);

            notificationService.createNotification(userId, title, message, type);
        } catch (Exception e) {
            log.error("Failed to process notification message: {}", payload, e);
        }
    }
}
