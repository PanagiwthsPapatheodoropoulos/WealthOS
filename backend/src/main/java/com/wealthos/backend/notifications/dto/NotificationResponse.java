package com.wealthos.backend.notifications.dto;

import lombok.Builder;
import com.wealthos.backend.notifications.entity.NotificationType;

import java.time.Instant;
import java.util.UUID;

@Builder
public record NotificationResponse(
        UUID id,
        UUID userId,
        String title,
        String message,
        NotificationType type,
        boolean read,
        Instant createdAt
) {
}
