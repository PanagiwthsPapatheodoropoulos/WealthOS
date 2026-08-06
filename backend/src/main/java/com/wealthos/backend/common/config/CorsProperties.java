package com.wealthos.backend.common.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

@ConfigurationProperties(prefix = "wealthos.cors")
public record CorsProperties(List<String> allowedOrigins) {
}
