package com.wealthos.backend.auth;

import com.wealthos.backend.auth.dto.AuthResponse;
import com.wealthos.backend.auth.dto.LoginRequest;
import com.wealthos.backend.auth.dto.RefreshRequest;
import com.wealthos.backend.auth.dto.RegisterRequest;
import com.wealthos.backend.common.dto.ApiResponse;
import com.wealthos.backend.support.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;

class AuthFlowIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    void fullAuthLifecycleWorksEndToEnd() {
        var registerRequest = new RegisterRequest("flow@example.com", "password123", "Flow", "Test");

        ResponseEntity<ApiResponse<AuthResponse>> registerResponse = restTemplate.exchange(
                "/api/auth/register", HttpMethod.POST, new HttpEntity<>(registerRequest),
                new ParameterizedTypeReference<>() {});

        assertThat(registerResponse.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        AuthResponse registerBody = registerResponse.getBody().data();
        assertThat(registerBody.accessToken()).isNotBlank();
        assertThat(registerBody.user().email()).isEqualTo("flow@example.com");

        HttpHeaders authHeaders = new HttpHeaders();
        authHeaders.setBearerAuth(registerBody.accessToken());

        ResponseEntity<ApiResponse<Object>> accountsResponse = restTemplate.exchange(
                "/api/accounts", HttpMethod.GET, new HttpEntity<>(authHeaders),
                new ParameterizedTypeReference<>() {});
        assertThat(accountsResponse.getStatusCode()).isEqualTo(HttpStatus.OK);

        var loginRequest = new LoginRequest("flow@example.com", "password123");
        ResponseEntity<ApiResponse<AuthResponse>> loginResponse = restTemplate.exchange(
                "/api/auth/login", HttpMethod.POST, new HttpEntity<>(loginRequest),
                new ParameterizedTypeReference<>() {});
        assertThat(loginResponse.getStatusCode()).isEqualTo(HttpStatus.OK);

        var badLogin = new LoginRequest("flow@example.com", "wrong-password");
        ResponseEntity<ApiResponse<AuthResponse>> badLoginResponse = restTemplate.exchange(
                "/api/auth/login", HttpMethod.POST, new HttpEntity<>(badLogin),
                new ParameterizedTypeReference<>() {});
        assertThat(badLoginResponse.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);

        var refreshRequest = new RefreshRequest(loginResponse.getBody().data().refreshToken());
        ResponseEntity<ApiResponse<AuthResponse>> refreshResponse = restTemplate.exchange(
                "/api/auth/refresh", HttpMethod.POST, new HttpEntity<>(refreshRequest),
                new ParameterizedTypeReference<>() {});
        assertThat(refreshResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(refreshResponse.getBody().data().accessToken()).isNotBlank();

        ResponseEntity<ApiResponse<AuthResponse>> reuseOldTokenResponse = restTemplate.exchange(
                "/api/auth/refresh", HttpMethod.POST, new HttpEntity<>(refreshRequest),
                new ParameterizedTypeReference<>() {});
        assertThat(reuseOldTokenResponse.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void registerRejectsDuplicateEmailWithConflict() {
        var request = new RegisterRequest("dup@example.com", "password123", "A", "B");
        restTemplate.postForEntity("/api/auth/register", request, ApiResponse.class);

        ResponseEntity<ApiResponse> secondAttempt = restTemplate.postForEntity(
                "/api/auth/register", request, ApiResponse.class);

        assertThat(secondAttempt.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void protectedEndpointRejectsMissingTokenWithExplicit401() {
        ResponseEntity<ApiResponse> response = restTemplate.getForEntity("/api/users/me", ApiResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void protectedEndpointRejectsGarbageTokenWithExplicit401() {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth("this-is-not-a-valid-jwt");

        ResponseEntity<ApiResponse> response = restTemplate.exchange(
                "/api/users/me", HttpMethod.GET, new HttpEntity<>(headers), ApiResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }
}
