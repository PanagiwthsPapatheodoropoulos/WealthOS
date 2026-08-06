package com.wealthos.backend.common.security;

import org.springframework.data.redis.core.StringRedisTemplate;

import java.time.Duration;
import java.util.UUID;

public final class SlidingWindowRateLimiter implements RateLimiter {

    private static final String KEY_PREFIX = "ratelimit:sliding:";
    private final StringRedisTemplate redisTemplate;
    private final int maxRequests;
    private final Duration window;

    public SlidingWindowRateLimiter(StringRedisTemplate redisTemplate, int maxRequests, Duration window) {
        this.redisTemplate = redisTemplate;
        this.maxRequests = maxRequests;
        this.window = window;
    }

    @Override
    public boolean tryConsume(String key) {
        try {
            String redisKey = KEY_PREFIX + key;
            long now = System.currentTimeMillis();
            long windowStart = now - window.toMillis();

            redisTemplate.opsForZSet().removeRangeByScore(redisKey, 0, windowStart);
            Long count = redisTemplate.opsForZSet().zCard(redisKey);

            if (count != null && count >= maxRequests) {
                return false;
            }

            redisTemplate.opsForZSet().add(redisKey, UUID.randomUUID().toString(), now);
            redisTemplate.expire(redisKey, window);
            return true;
        } catch (Exception e) {
            return true;
        }
    }
}
