package com.wealthos.backend.common.idempotency;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
public class IdempotencyService {

    private final StringRedisTemplate redis;
    private static final Duration TTL = Duration.ofMinutes(5);

    public IdempotencyService(StringRedisTemplate redis) {
        this.redis = redis;
    }

    /** Returns null if this is a new key (and reserves it), "PENDING" if in-flight, or the cached JSON result. */
    public String checkAndReserve(String userId, String idempotencyKey) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) return null;
        String key = "idem:" + userId + ":" + idempotencyKey;
        Boolean reserved = redis.opsForValue().setIfAbsent(key, "PENDING", TTL);
        if (Boolean.TRUE.equals(reserved)) return null;
        return redis.opsForValue().get(key);
    }

    public void store(String userId, String idempotencyKey, String resultJson) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) return;
        redis.opsForValue().set("idem:" + userId + ":" + idempotencyKey, resultJson, TTL);
    }

    public void release(String userId, String idempotencyKey) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) return;
        redis.delete("idem:" + userId + ":" + idempotencyKey);
    }
}
