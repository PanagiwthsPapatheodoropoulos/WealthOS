package com.wealthos.backend.alerts.service;

import com.wealthos.backend.alerts.dto.AlertResponse;
import com.wealthos.backend.alerts.dto.CreateAlertRequest;
import com.wealthos.backend.alerts.entity.Alert;
import com.wealthos.backend.alerts.entity.AlertStatus;
import com.wealthos.backend.alerts.mapper.AlertMapper;
import com.wealthos.backend.alerts.repository.AlertRepository;
import com.wealthos.backend.assets.entity.Asset;
import com.wealthos.backend.assets.service.AssetService;
import com.wealthos.backend.common.events.AlertTriggeredEvent;
import com.wealthos.backend.common.events.WealthEventPublisher;
import com.wealthos.backend.common.exception.ResourceNotFoundException;
import com.wealthos.backend.users.entity.User;
import com.wealthos.backend.users.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AlertService {

    private final AlertRepository alertRepository;
    private final UserService userService;
    private final AssetService assetService;
    private final WealthEventPublisher eventPublisher;
    private final AlertMapper alertMapper;
    private final AlertNotificationDispatcher alertNotificationDispatcher;

    @Transactional(readOnly = true)
    public List<AlertResponse> list(UUID userId) {
        return alertRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public AlertResponse create(UUID userId, CreateAlertRequest request) {
        User user = userService.getEntityById(userId);

        Asset asset = request.assetId() != null
                ? assetService.getEntityById(request.assetId())
                : assetService.getOrCreateBySymbol(
                        request.symbol(), request.name(), request.assetType(),
                        request.currency(), request.currentPrice());

        Alert alert = Alert.builder()
                .user(user)
                .asset(asset)
                .condition(request.condition())
                .targetPrice(request.targetPrice())
                .status(AlertStatus.ACTIVE)
                .build();

        Alert saved = alertRepository.save(alert);
        if (request.currentPrice() != null && saved.matches(request.currentPrice())) {
            triggerAlert(saved, request.currentPrice());
        }
        return toResponse(saved);
    }

    @Transactional
    public void cancel(UUID id, UUID userId) {
        Alert alert = alertRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Alert", id));
        alert.setStatus(AlertStatus.CANCELLED);
        alertRepository.save(alert);
    }

    @Transactional
    public void delete(UUID id, UUID userId) {
        Alert alert = alertRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Alert", id));
        alertRepository.delete(alert);
    }

    @Transactional
    public int checkAndTriggerAlerts() {
        return checkAndTriggerAll();
    }

    @Transactional
    public int checkAndTriggerAll() {
        List<Alert> activeAlerts = alertRepository.findAllActiveWithAssetAndUser(AlertStatus.ACTIVE);
        int triggeredCount = 0;

        for (Alert alert : activeAlerts) {
            BigDecimal currentPrice = alert.getAsset().getCurrentPrice();
            if (alert.matches(currentPrice)) {
                triggerAlert(alert, currentPrice);
                triggeredCount++;
            }
        }
        return triggeredCount;
    }

    @Transactional
    public void checkAndTriggerForAsset(String symbol, BigDecimal newPrice) {
        Asset asset = assetService.getBySymbol(symbol);
        if (asset != null) {
            checkAndTriggerForAsset(asset.getId(), newPrice);
        }
    }

    @Transactional
    public void checkAndTriggerForAsset(UUID assetId, BigDecimal newPrice) {
        List<Alert> activeAlerts = alertRepository.findActiveByAssetId(AlertStatus.ACTIVE, assetId);
        for (Alert alert : activeAlerts) {
            if (alert.matches(newPrice)) {
                triggerAlert(alert, newPrice);
            }
        }
    }

    private void triggerAlert(Alert alert, BigDecimal currentPrice) {
        alert.setStatus(AlertStatus.TRIGGERED);
        alert.setTriggeredAt(Instant.now());
        alertRepository.save(alert);

        log.info("Triggered price alert {} for asset {} (Target: {}, Current: {})",
                alert.getId(), alert.getAsset().getSymbol(), alert.getTargetPrice(), currentPrice);

        eventPublisher.publishAlertTriggered(new AlertTriggeredEvent(
                alert.getUser().getId(),
                alert.getAsset().getSymbol(),
                alert.getCondition(),
                alert.getTargetPrice(),
                currentPrice
        ));

        alertNotificationDispatcher.dispatchAlertNotification(alert, currentPrice);
    }

    private AlertResponse toResponse(Alert alert) {
        return alertMapper.toResponse(alert);
    }
}
