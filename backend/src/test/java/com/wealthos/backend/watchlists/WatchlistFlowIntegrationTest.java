package com.wealthos.backend.watchlists;

import com.wealthos.backend.assets.entity.Asset;
import com.wealthos.backend.assets.entity.AssetType;
import com.wealthos.backend.assets.repository.AssetRepository;
import com.wealthos.backend.auth.dto.AuthResponse;
import com.wealthos.backend.auth.dto.RegisterRequest;
import com.wealthos.backend.common.dto.ApiResponse;
import com.wealthos.backend.support.AbstractIntegrationTest;
import com.wealthos.backend.watchlists.dto.AddWatchlistItemRequest;
import com.wealthos.backend.watchlists.dto.CreateWatchlistRequest;
import com.wealthos.backend.watchlists.dto.WatchlistResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;

import java.math.BigDecimal;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class WatchlistFlowIntegrationTest extends AbstractIntegrationTest {

    @Autowired private TestRestTemplate restTemplate;
    @Autowired private AssetRepository assetRepository;

    private String accessToken;
    private UUID assetId;

    @BeforeEach
    void setUp() {
        Asset asset = assetRepository.save(Asset.builder()
                .symbol("NFLX").name("Netflix").assetType(AssetType.STOCK)
                .currency("USD").currentPrice(new BigDecimal("600.00")).build());
        assetId = asset.getId();

        var registerRequest = new RegisterRequest(
                "watcher-" + UUID.randomUUID() + "@example.com", "password123", "Watch", "List");
        ResponseEntity<ApiResponse<AuthResponse>> registerResponse = restTemplate.exchange(
                "/api/auth/register", HttpMethod.POST, new HttpEntity<>(registerRequest),
                new ParameterizedTypeReference<>() {});
        accessToken = registerResponse.getBody().data().accessToken();
    }

    @Test
    void createWatchlistAddItemThenRemoveItemEndToEnd() {
        var createRequest = new CreateWatchlistRequest("Streaming Stocks");
        ResponseEntity<ApiResponse<WatchlistResponse>> createResponse = restTemplate.exchange(
                "/api/watchlists", HttpMethod.POST, new HttpEntity<>(createRequest, authHeaders()),
                new ParameterizedTypeReference<>() {});

        assertThat(createResponse.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        UUID watchlistId = createResponse.getBody().data().id();

        var addRequest = new AddWatchlistItemRequest(assetId);
        ResponseEntity<ApiResponse<WatchlistResponse>> addResponse = restTemplate.exchange(
                "/api/watchlists/" + watchlistId + "/items", HttpMethod.POST,
                new HttpEntity<>(addRequest, authHeaders()), new ParameterizedTypeReference<>() {});

        assertThat(addResponse.getBody().data().items()).hasSize(1);
        assertThat(addResponse.getBody().data().items().get(0).symbol()).isEqualTo("NFLX");

        // Duplicate add must be rejected with 409
        ResponseEntity<ApiResponse> duplicateResponse = restTemplate.exchange(
                "/api/watchlists/" + watchlistId + "/items", HttpMethod.POST,
                new HttpEntity<>(addRequest, authHeaders()), ApiResponse.class);
        assertThat(duplicateResponse.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);

        ResponseEntity<ApiResponse<WatchlistResponse>> removeResponse = restTemplate.exchange(
                "/api/watchlists/" + watchlistId + "/items/" + assetId, HttpMethod.DELETE,
                new HttpEntity<>(authHeaders()), new ParameterizedTypeReference<>() {});

        assertThat(removeResponse.getBody().data().items()).isEmpty();
    }

    private HttpHeaders authHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        return headers;
    }
}
