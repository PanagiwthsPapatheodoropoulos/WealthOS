package com.wealthos.backend.common.security;

import com.wealthos.backend.support.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class RateLimitInterceptorTest extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    private static final String LOGIN_BODY = """
            {"email":"nobody@example.com","password":"wrong-password"}
            """;

    @Test
    void allowsTenAttemptsThenRejectsTheEleventhWithinTheSameWindow() throws Exception {
        String fakeIp = "203.0.113." + UUID.randomUUID().hashCode() % 250;

        for (int i = 1; i <= 10; i++) {
            mockMvc.perform(loginRequest(fakeIp))
                    .andExpect(status().isUnauthorized()); // wrong credentials, but not yet rate-limited
        }

        mockMvc.perform(loginRequest(fakeIp))
                .andExpect(status().isTooManyRequests());
    }

    @Test
    void ratelimitIsScopedPerClientIpNotGlobally() throws Exception {
        String ipA = "198.51.100." + (UUID.randomUUID().hashCode() % 250);
        String ipB = "198.51.100." + ((UUID.randomUUID().hashCode() % 250) + 1);

        for (int i = 1; i <= 10; i++) {
            mockMvc.perform(loginRequest(ipA)).andExpect(status().isUnauthorized());
        }
        // ipA is now exhausted...
        mockMvc.perform(loginRequest(ipA)).andExpect(status().isTooManyRequests());

        // ...but ipB still has its own fresh window
        mockMvc.perform(loginRequest(ipB)).andExpect(status().isUnauthorized());
    }

    private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder loginRequest(String remoteIp) {
        return post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(LOGIN_BODY)
                .with(request -> {
                    request.setRemoteAddr(remoteIp);
                    return request;
                });
    }
}
