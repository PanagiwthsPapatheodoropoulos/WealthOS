package com.wealthos.backend.notifications.dto;

import java.util.UUID;

public record NotificationResponseDto(UUID id,String title,String message,boolean read,String createdAt) {
}
