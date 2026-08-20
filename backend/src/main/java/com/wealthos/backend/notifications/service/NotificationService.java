package com.wealthos.backend.notifications.service;

import lombok.RequiredArgsConstructor;
import com.wealthos.backend.notifications.dto.NotificationResponse;
import com.wealthos.backend.notifications.dto.UnreadCountResponse;
import com.wealthos.backend.notifications.entity.Notification;
import com.wealthos.backend.notifications.entity.NotificationType;
import com.wealthos.backend.notifications.mapper.NotificationMapper;
import com.wealthos.backend.notifications.repository.NotificationRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final NotificationMapper notificationMapper;

    @Transactional(readOnly = true)
    public Page<NotificationResponse> getUserNotifications(UUID userId, Pageable pageable) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable)
                .map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public UnreadCountResponse getUnreadCount(UUID userId) {
        long count = notificationRepository.countByUserIdAndReadFalse(userId);
        return new UnreadCountResponse(count);
    }

    @Transactional
    public void markAsRead(UUID id, UUID userId) {
        notificationRepository.markAsRead(id, userId);
    }

    @Transactional
    public void createNotification(UUID userId, String title, String message, NotificationType type) {
        Notification notification = Notification.builder()
                .userId(userId)
                .title(title)
                .message(message)
                .type(type)
                .read(false)
                .build();
        notificationRepository.save(notification);
    }

    @Transactional
    public void createNotification(Notification notification) {
        notificationRepository.save(notification);
    }

    public NotificationResponse toResponse(Notification n) {
        return notificationMapper.toResponse(n);
    }
}
