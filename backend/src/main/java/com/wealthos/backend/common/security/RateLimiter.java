package com.wealthos.backend.common.security;

public sealed interface RateLimiter permits SlidingWindowRateLimiter, TokenBucketRateLimiter {
    boolean tryConsume(String key);
}
