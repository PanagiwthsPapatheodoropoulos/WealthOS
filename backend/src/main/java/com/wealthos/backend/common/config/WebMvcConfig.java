package com.wealthos.backend.common.config;

import lombok.RequiredArgsConstructor;
import com.wealthos.backend.common.security.*;
import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.List;

@Configuration
@RequiredArgsConstructor
public class WebMvcConfig implements WebMvcConfigurer {

    private final CurrentUserArgumentResolver currentUserArgumentResolver;
    private final RateLimitInterceptor loginRateLimitInterceptor;
    private final MarketDataRateLimitInterceptor marketDataRateLimitInterceptor;
    private final AiInsightsRateLimitInterceptor aiInsightsRateLimitInterceptor;

    

    @Override
    public void addArgumentResolvers(@NonNull List<HandlerMethodArgumentResolver> resolvers) {
        resolvers.add(currentUserArgumentResolver);
    }

    @Override
    public void addInterceptors(@NonNull InterceptorRegistry registry) {
        registry.addInterceptor(loginRateLimitInterceptor).addPathPatterns("/api/auth/login");
        registry.addInterceptor(marketDataRateLimitInterceptor).addPathPatterns("/api/assets/**", "/api/market/**");
        registry.addInterceptor(aiInsightsRateLimitInterceptor).addPathPatterns("/api/ai/**");
    }
}
