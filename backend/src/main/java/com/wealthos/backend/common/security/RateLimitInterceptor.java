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
public class RateLimitInterceptor implements HandlerInterceptor {

    private static final int MAX_ATTEMPTS_PER_WINDOW = 10;
    private static final Duration WINDOW = Duration.ofMinutes(1);

    private final StringRedisTemplate redisTemplate;

    

    @Override
    public boolean preHandle(@NonNull HttpServletRequest request,
                             @NonNull HttpServletResponse response,
                             @NonNull Object handler) {
        String clientIp = extractClientIp(request);
        String key = "ratelimit:login:" + clientIp;

        try {
            Long attempts = redisTemplate.opsForValue().increment(key);

            if (attempts != null && attempts == 1L) {
                redisTemplate.expire(key, WINDOW);
            }

            if (attempts != null && attempts > MAX_ATTEMPTS_PER_WINDOW) {
                throw new TooManyRequestsException("Too many login attempts. Please try again in a minute.");
            }
        } catch (TooManyRequestsException e) {
            throw e;
        } catch (Exception e) {
            // Redis fallback when offline in local dev mode
            return true;
        }

        return true;
    }

    private String extractClientIp(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
