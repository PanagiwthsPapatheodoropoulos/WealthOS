package com.wealthos.backend.orders.scheduler;

import lombok.RequiredArgsConstructor;
import com.wealthos.backend.common.lock.DistributedLockService;
import com.wealthos.backend.orders.service.OrderService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Optional;

@Component
@Slf4j
@RequiredArgsConstructor
public class OrderMatchingScheduler {

    private static final String LOCK_NAME = "order-matching-scheduler";
    private static final Duration LOCK_TTL = Duration.ofSeconds(25);

    private final OrderService orderService;
    private final DistributedLockService lockService;

    

    @Scheduled(fixedDelay = 30_000)
    public void matchOrders() {
        Optional<String> ownerToken = lockService.tryLock(LOCK_NAME, LOCK_TTL);
        if (ownerToken.isEmpty()) {
            log.debug("Skipping order matching — another instance holds the lock");
            return;
        }
        try {
            orderService.matchPendingOrders();
        } finally {
            lockService.unlock(LOCK_NAME, ownerToken.get());
        }
    }
}
