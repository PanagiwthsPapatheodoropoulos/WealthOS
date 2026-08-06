package com.wealthos.backend.common.security;

import lombok.RequiredArgsConstructor;
import com.wealthos.backend.common.exception.TooManyRequestsException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
@RequiredArgsConstructor
public class AiInsightsRateLimitInterceptor implements HandlerInterceptor {

    private final TokenBucketRateLimiter limiter;

    

    @Override
    public boolean preHandle(@NonNull HttpServletRequest request, @NonNull HttpServletResponse response, @NonNull Object handler) {
        var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        String key = auth != null ? auth.getName() : request.getRemoteAddr();

        if (!limiter.tryConsume("ai:" + key)) {
            throw new TooManyRequestsException("AI insights rate limit exceeded. Try again shortly.");
        }
        return true;
    }
}
