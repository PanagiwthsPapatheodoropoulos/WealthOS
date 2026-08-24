package com.wealthos.backend.alerts;

import com.wealthos.backend.auth.dto.AuthResponse;
import com.wealthos.backend.auth.dto.LoginRequest;
import com.wealthos.backend.common.dto.ApiResponse;
import com.wealthos.backend.support.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;

class AlertFlowIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    private HttpHeaders adminHeaders() {
        var loginRequest = new LoginRequest("admin@wealthos.dev", "ChangeMe123!");
        ResponseEntity<ApiResponse<AuthResponse>> loginResponse = restTemplate.exchange(
                "/api/auth/login", HttpMethod.POST, new HttpEntity<>(loginRequest),
                new ParameterizedTypeReference<>() {});
        HttpHeaders headers = new HttpHeaders();
        if (loginResponse.getBody() != null && loginResponse.getBody().data() != null) {
            headers.setBearerAuth(loginResponse.getBody().data().accessToken());
        }
        return headers;
    }

    @Test
    void contextLoads() {
        assertThat(restTemplate).isNotNull();
    }
}
