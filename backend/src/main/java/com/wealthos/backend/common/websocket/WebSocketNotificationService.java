package com.wealthos.backend.common.websocket;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class WebSocketNotificationService {

    private final SimpMessagingTemplate messagingTemplate;

    public void sendToUser(UUID userId, Object payload) {
        if (userId == null) return;
        log.debug("Pushing WebSocket message to user {}: {}", userId, payload);
        // Authenticated user queue: /user/{userId}/queue/notifications
        messagingTemplate.convertAndSendToUser(userId.toString(), "/queue/notifications", payload);
        // Topic broadcast for backward compatibility:
        messagingTemplate.convertAndSend("/topic/user/" + userId + "/notifications", payload);
    }
}
