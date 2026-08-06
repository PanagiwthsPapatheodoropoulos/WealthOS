package com.wealthos.backend.common.config;

import com.wealthos.backend.common.security.SlidingWindowRateLimiter;
import com.wealthos.backend.common.security.TokenBucketRateLimiter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.core.StringRedisTemplate;

import java.time.Duration;

@Configuration
public class RateLimitConfig {

    @Bean
    public SlidingWindowRateLimiter slidingWindowRateLimiter(StringRedisTemplate redisTemplate) {
        return new SlidingWindowRateLimiter(redisTemplate, 60, Duration.ofMinutes(1));
    }

    @Bean
    public TokenBucketRateLimiter tokenBucketRateLimiter(StringRedisTemplate redisTemplate) {
        return new TokenBucketRateLimiter(redisTemplate, 10, 5.0 / 60.0);
    }
}
