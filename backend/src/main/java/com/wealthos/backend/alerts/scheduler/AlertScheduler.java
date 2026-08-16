package com.wealthos.backend.alerts.scheduler;

import lombok.RequiredArgsConstructor;
import com.wealthos.backend.alerts.service.AlertService;
import com.wealthos.backend.common.lock.DistributedLockService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Optional;

@Component
@Slf4j
@RequiredArgsConstructor
public class AlertScheduler {

    private static final String LOCK_NAME = "alert-scheduler";
    private static final Duration LOCK_TTL = Duration.ofSeconds(25); // < 30s scheduler interval

    private final AlertService alertService;
    private final DistributedLockService lockService;

    

    @Scheduled(fixedDelay = 30_000)
    public void checkAlerts() {
        Optional<String> ownerToken = lockService.tryLock(LOCK_NAME, LOCK_TTL);
        if (ownerToken.isEmpty()) {
            log.debug("Skipping alert check — another instance holds the lock");
            return;
        }
        try {
            alertService.checkAndTriggerAlerts();
        } finally {
            lockService.unlock(LOCK_NAME, ownerToken.get());
        }
    }
}
