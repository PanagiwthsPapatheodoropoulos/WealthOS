package com.wealthos.backend.common.lock;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class DistributedLockService {

    private static final Logger log = LoggerFactory.getLogger(DistributedLockService.class);
    private static final String KEY_PREFIX = "lock:";
    private static final String RELEASE_SCRIPT =
            "if redis.call('GET', KEYS[1]) == ARGV[1] then " +
            "  return redis.call('DEL', KEYS[1]) " +
            "else " +
            "  return 0 " +
            "end";

    private final StringRedisTemplate redisTemplate;
    private final DefaultRedisScript<Long> releaseScript;

    public DistributedLockService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
        this.releaseScript = new DefaultRedisScript<>(RELEASE_SCRIPT, Long.class);
    }

    public Optional<String> tryLock(String lockName, Duration ttl) {
        String key = KEY_PREFIX + lockName;
        String ownerToken = UUID.randomUUID().toString();

        try {
            Boolean acquired = redisTemplate.opsForValue().setIfAbsent(key, ownerToken, ttl);
            return Boolean.TRUE.equals(acquired) ? Optional.of(ownerToken) : Optional.empty();
        } catch (Exception e) {
            log.warn("Redis lock unavailable for {} - skipping this cycle to avoid duplicate execution: {}", lockName, e.getMessage());
            return Optional.empty();
        }
    }

    public void unlock(String lockName, String ownerToken) {
        String key = KEY_PREFIX + lockName;
        try {
            redisTemplate.execute(releaseScript, List.of(key), ownerToken);
        } catch (Exception e) {
            log.debug("Redis unlock unavailable for {}: {}", lockName, e.getMessage());
        }
    }
}
