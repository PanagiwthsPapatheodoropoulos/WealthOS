package com.wealthos.backend.common.security;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;

import java.util.List;

public final class TokenBucketRateLimiter implements RateLimiter {

    private static final String KEY_PREFIX = "ratelimit:bucket:";

    private static final String SCRIPT = """
            local key = KEYS[1]
            local capacity = tonumber(ARGV[1])
            local refill_per_sec = tonumber(ARGV[2])
            local now = tonumber(ARGV[3])

            local bucket = redis.call('HMGET', key, 'tokens', 'last_refill')
            local tokens = tonumber(bucket[1])
            local last_refill = tonumber(bucket[2])

            if tokens == nil then
                tokens = capacity
                last_refill = now
            end

            local elapsed = math.max(0, now - last_refill)
            local refill = elapsed * refill_per_sec / 1000.0
            tokens = math.min(capacity, tokens + refill)

            local allowed = 0
            if tokens >= 1 then
                tokens = tokens - 1
                allowed = 1
            end

            redis.call('HMSET', key, 'tokens', tostring(tokens), 'last_refill', tostring(now))
            redis.call('EXPIRE', key, 3600)

            return allowed
            """;

    private final StringRedisTemplate redisTemplate;
    private final DefaultRedisScript<Long> script;
    private final int capacity;
    private final double refillPerSecond;

    public TokenBucketRateLimiter(StringRedisTemplate redisTemplate, int capacity, double refillPerSecond) {
        this.redisTemplate = redisTemplate;
        this.capacity = capacity;
        this.refillPerSecond = refillPerSecond;
        this.script = new DefaultRedisScript<>(SCRIPT, Long.class);
    }

    @Override
    public boolean tryConsume(String key) {
        try {
            String redisKey = KEY_PREFIX + key;
            Long result = redisTemplate.execute(script,
                    List.of(redisKey),
                    String.valueOf(capacity), String.valueOf(refillPerSecond), String.valueOf(System.currentTimeMillis()));
            return result != null && result == 1L;
        } catch (Exception e) {
            return true;
        }
    }
}
