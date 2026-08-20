package com.wealthos.backend.notifications.controller;

import lombok.RequiredArgsConstructor;
import com.wealthos.backend.common.dto.ApiResponse;
import com.wealthos.backend.common.security.AuthenticatedUser;
import com.wealthos.backend.common.security.CurrentUser;
import com.wealthos.backend.notifications.dto.NotificationResponse;
import com.wealthos.backend.notifications.dto.UnreadCountResponse;
import com.wealthos.backend.notifications.service.NotificationService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    public ApiResponse<Page<NotificationResponse>> getNotifications(
            @CurrentUser AuthenticatedUser currentUser,
            @PageableDefault(size = 20) Pageable pageable) {
        return ApiResponse.ok(notificationService.getUserNotifications(currentUser.id(), pageable));
    }

    @GetMapping("/unread-count")
    public ApiResponse<UnreadCountResponse> getUnreadCount(@CurrentUser AuthenticatedUser currentUser) {
        return ApiResponse.ok(notificationService.getUnreadCount(currentUser.id()));
    }

    @PostMapping("/{id}/read")
    public ApiResponse<Void> markAsRead(@CurrentUser AuthenticatedUser currentUser, @PathVariable UUID id) {
        notificationService.markAsRead(id, currentUser.id());
        return ApiResponse.ok(null, "Marked as read");
    }
}
