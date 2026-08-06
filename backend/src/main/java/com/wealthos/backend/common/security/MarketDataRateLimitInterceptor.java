package com.wealthos.backend.common.security;

import lombok.RequiredArgsConstructor;
import com.wealthos.backend.common.exception.TooManyRequestsException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.time.Duration;

@Component
@RequiredArgsConstructor
public class MarketDataRateLimitInterceptor implements HandlerInterceptor {

    private final SlidingWindowRateLimiter limiter;

    

    @Override
    public boolean preHandle(@NonNull HttpServletRequest request, @NonNull HttpServletResponse response, @NonNull Object handler) {
        String ip = request.getRemoteAddr();
        if (!limiter.tryConsume("market:" + ip)) {
            throw new TooManyRequestsException("Market data rate limit exceeded. Please slow down.");
        }
        return true;
    }
}
