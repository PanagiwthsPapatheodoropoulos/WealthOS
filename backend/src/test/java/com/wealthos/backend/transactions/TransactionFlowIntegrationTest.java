package com.wealthos.backend.transactions;

import com.wealthos.backend.assets.entity.Asset;
import com.wealthos.backend.assets.entity.AssetType;
import com.wealthos.backend.assets.repository.AssetRepository;
import com.wealthos.backend.auth.dto.AuthResponse;
import com.wealthos.backend.auth.dto.RegisterRequest;
import com.wealthos.backend.common.dto.ApiResponse;
import com.wealthos.backend.portfolios.dto.PortfolioSummaryResponse;
import com.wealthos.backend.support.AbstractIntegrationTest;
import com.wealthos.backend.transactions.dto.BuyRequest;
import com.wealthos.backend.transactions.dto.SellRequest;
import com.wealthos.backend.transactions.dto.TransactionResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class TransactionFlowIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;
    @Autowired
    private AssetRepository assetRepository;

    private String accessToken;
    private UUID portfolioId;
    private UUID assetId;

    @BeforeEach
    void setUp() {
        Asset asset = assetRepository.findBySymbol("TSLA")
                .orElseGet(() -> assetRepository.save(Asset.builder()
                        .symbol("TSLA").name("Tesla Inc.").assetType(AssetType.STOCK)
                        .currency("USD").currentPrice(new BigDecimal("200.00")).build()));
        assetId = asset.getId();

        var registerRequest = new RegisterRequest(
                "trader-" + UUID.randomUUID() + "@example.com", "password123", "Trader", "One");
        ResponseEntity<ApiResponse<AuthResponse>> registerResponse = restTemplate.exchange(
                "/api/auth/register", HttpMethod.POST, new HttpEntity<>(registerRequest),
                new ParameterizedTypeReference<>() {});

        accessToken = registerResponse.getBody().data().accessToken();

        ResponseEntity<ApiResponse<List<PortfolioSummaryResponse>>> portfoliosResponse = restTemplate.exchange(
                "/api/portfolios", HttpMethod.GET, new HttpEntity<>(authHeaders()),
                new ParameterizedTypeReference<>() {});
        portfolioId = portfoliosResponse.getBody().data().get(0).id();

        ResponseEntity<ApiResponse<List<com.wealthos.backend.accounts.dto.AccountResponse>>> accountsResponse = restTemplate.exchange(
                "/api/accounts", HttpMethod.GET, new HttpEntity<>(authHeaders()),
                new ParameterizedTypeReference<>() {});
        UUID accountId = accountsResponse.getBody().data().get(0).id();
        restTemplate.exchange(
                "/api/accounts/" + accountId + "/deposit", HttpMethod.POST,
                new HttpEntity<>(new com.wealthos.backend.accounts.dto.CashMovementRequest(new BigDecimal("5000.00")), authHeaders()),
                new ParameterizedTypeReference<>() {});
    }

    @Test
    void buyThenSellRoundTripUpdatesCashAndReturnsRealizedPnl() {
        var buyRequest = new BuyRequest(portfolioId, assetId, new BigDecimal("10")); // 10 * 200 = 2000
        ResponseEntity<ApiResponse<TransactionResponse>> buyResponse = restTemplate.exchange(
                "/api/transactions/buy", HttpMethod.POST, new HttpEntity<>(buyRequest, authHeaders()),
                new ParameterizedTypeReference<>() {});

        assertThat(buyResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(buyResponse.getBody().data().totalAmount()).isEqualByComparingTo("2000.00");
        assertThat(buyResponse.getBody().data().realizedPnl()).isNull();

        Asset asset = assetRepository.findById(assetId).orElseThrow();
        asset.setCurrentPrice(new BigDecimal("250.00"));
        assetRepository.save(asset);

        var sellRequest = new SellRequest(portfolioId, assetId, new BigDecimal("10"));
        ResponseEntity<ApiResponse<TransactionResponse>> sellResponse = restTemplate.exchange(
                "/api/transactions/sell", HttpMethod.POST, new HttpEntity<>(sellRequest, authHeaders()),
                new ParameterizedTypeReference<>() {});

        assertThat(sellResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        // proceeds = 10*250=2500, cost basis = 10*200=2000 -> realized P/L = 500.00
        assertThat(sellResponse.getBody().data().realizedPnl()).isEqualByComparingTo("500.00");
    }

    @Test
    void buyRejectedWhenExceedingCashBalance() {
        var hugeBuy = new BuyRequest(portfolioId, assetId, new BigDecimal("1000")); // 1000*200 = 200000 >> cash balance

        ResponseEntity<ApiResponse> response = restTemplate.exchange(
                "/api/transactions/buy", HttpMethod.POST, new HttpEntity<>(hugeBuy, authHeaders()),
                ApiResponse.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
    }

    private HttpHeaders authHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        return headers;
    }
}
