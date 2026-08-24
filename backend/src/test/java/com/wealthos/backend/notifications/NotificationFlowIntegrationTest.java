package com.wealthos.backend.notifications;

import com.wealthos.backend.accounts.dto.AccountResponse;
import com.wealthos.backend.assets.entity.Asset;
import com.wealthos.backend.assets.entity.AssetType;
import com.wealthos.backend.assets.repository.AssetRepository;
import com.wealthos.backend.auth.dto.AuthResponse;
import com.wealthos.backend.auth.dto.RegisterRequest;
import com.wealthos.backend.common.dto.ApiResponse;
import com.wealthos.backend.notifications.dto.NotificationResponse;
import com.wealthos.backend.portfolios.dto.PortfolioSummaryResponse;
import com.wealthos.backend.support.AbstractIntegrationTest;
import com.wealthos.backend.transactions.dto.BuyRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

class NotificationFlowIntegrationTest extends AbstractIntegrationTest {

    @Autowired private TestRestTemplate restTemplate;
    @Autowired private AssetRepository assetRepository;

    private String accessToken;
    private UUID portfolioId;
    private UUID assetId;

    @BeforeEach
    void setUp() {
        Asset asset = assetRepository.save(Asset.builder()
                .symbol("IBM").name("IBM").assetType(AssetType.STOCK)
                .currency("USD").currentPrice(new BigDecimal("180.00")).build());
        assetId = asset.getId();

        var registerRequest = new RegisterRequest(
                "notifuser-" + UUID.randomUUID() + "@example.com", "password123", "Notif", "User");
        ResponseEntity<ApiResponse<AuthResponse>> registerResponse = restTemplate.exchange(
                "/api/auth/register", HttpMethod.POST, new HttpEntity<>(registerRequest),
                new ParameterizedTypeReference<>() {});
        accessToken = registerResponse.getBody().data().accessToken();

        ResponseEntity<ApiResponse<List<PortfolioSummaryResponse>>> portfoliosResponse = restTemplate.exchange(
                "/api/portfolios", HttpMethod.GET, new HttpEntity<>(authHeaders()),
                new ParameterizedTypeReference<>() {});
        portfolioId = portfoliosResponse.getBody().data().get(0).id();
    }

    @Test
    void buyingAnAssetEventuallyProducesANotificationViaRabbitMq() {
        var buyRequest = new BuyRequest(portfolioId, assetId, new BigDecimal("2"));
        restTemplate.exchange("/api/transactions/buy", HttpMethod.POST,
                new HttpEntity<>(buyRequest, authHeaders()), ApiResponse.class);

        await().atMost(Duration.ofSeconds(5)).untilAsserted(() -> {
            ResponseEntity<ApiResponse<List<NotificationResponse>>> notificationsResponse = restTemplate.exchange(
                    "/api/notifications", HttpMethod.GET, new HttpEntity<>(authHeaders()),
                    new ParameterizedTypeReference<>() {});

            List<NotificationResponse> notifications = notificationsResponse.getBody().data();
            assertThat(notifications).isNotEmpty();
            assertThat(notifications.get(0).title()).contains("IBM");
            assertThat(notifications.get(0).read()).isFalse();
        });
    }

    @Test
    void unreadCountReflectsNewNotificationsAndDropsToZeroAfterMarkAllRead() {
        var buyRequest = new BuyRequest(portfolioId, assetId, new BigDecimal("1"));
        restTemplate.exchange("/api/transactions/buy", HttpMethod.POST,
                new HttpEntity<>(buyRequest, authHeaders()), ApiResponse.class);

        await().atMost(Duration.ofSeconds(5)).untilAsserted(() -> {
            ResponseEntity<ApiResponse<java.util.Map<String, Long>>> unread = restTemplate.exchange(
                    "/api/notifications/unread-count", HttpMethod.GET, new HttpEntity<>(authHeaders()),
                    new ParameterizedTypeReference<>() {});
            assertThat(unread.getBody().data().get("unreadCount")).isGreaterThan(0L);
        });

        restTemplate.exchange("/api/notifications/mark-all-read", HttpMethod.POST,
                new HttpEntity<>(authHeaders()), ApiResponse.class);

        ResponseEntity<ApiResponse<java.util.Map<String, Long>>> afterMarkRead = restTemplate.exchange(
                "/api/notifications/unread-count", HttpMethod.GET, new HttpEntity<>(authHeaders()),
                new ParameterizedTypeReference<>() {});
        assertThat(afterMarkRead.getBody().data().get("unreadCount")).isEqualTo(0L);
    }

    private HttpHeaders authHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        return headers;
    }
}
