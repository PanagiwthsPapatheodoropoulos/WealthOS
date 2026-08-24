package com.wealthos.backend.portfolios.service;

import com.wealthos.backend.accounts.entity.Account;
import com.wealthos.backend.accounts.entity.AccountType;
import com.wealthos.backend.accounts.repository.AccountRepository;
import com.wealthos.backend.assets.entity.Asset;
import com.wealthos.backend.assets.entity.AssetType;
import com.wealthos.backend.assets.repository.AssetRepository;
import com.wealthos.backend.common.exception.ResourceNotFoundException;
import com.wealthos.backend.portfolios.dto.CreatePortfolioRequest;
import com.wealthos.backend.portfolios.dto.PortfolioDetailResponse;
import com.wealthos.backend.portfolios.dto.PortfolioSummaryResponse;
import com.wealthos.backend.portfolios.entity.Portfolio;
import com.wealthos.backend.portfolios.entity.PortfolioAsset;
import com.wealthos.backend.portfolios.repository.PortfolioAssetRepository;
import com.wealthos.backend.portfolios.repository.PortfolioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PortfolioServiceTest {

    @Mock private PortfolioRepository portfolioRepository;
    @Mock private PortfolioAssetRepository portfolioAssetRepository;
    @Mock private AccountRepository accountRepository;
    @Mock private AssetRepository assetRepository;

    private PortfolioService portfolioService;

    @BeforeEach
    void setUp() {
        portfolioService = new PortfolioService(portfolioRepository, portfolioAssetRepository, accountRepository, assetRepository);
    }

    @Test
    void getEntityByIdAndUserThrowsWhenNotOwned() {
        UUID id = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        when(portfolioRepository.findByIdAndUserId(id, userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> portfolioService.getEntityByIdAndUser(id, userId))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void createRejectsAccountNotOwnedByUser() {
        UUID userId = UUID.randomUUID();
        UUID accountId = UUID.randomUUID();
        when(accountRepository.findByIdAndUserId(accountId, userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> portfolioService.create(userId, new CreatePortfolioRequest(accountId, "New")))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void getDetailSumsHoldingsValueAndComputesUnrealizedPnl() {
        UUID id = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        Account account = Account.builder().id(UUID.randomUUID()).accountType(AccountType.CASH)
                .cashBalance(new BigDecimal("200.00")).build();
        Portfolio portfolio = Portfolio.builder().id(id).account(account).name("Main").build();

        Asset asset = Asset.builder().id(UUID.randomUUID()).symbol("AAPL").assetType(AssetType.STOCK)
                .currentPrice(new BigDecimal("150.00")).build();
        PortfolioAsset holding = PortfolioAsset.builder()
                .portfolio(portfolio).asset(asset)
                .quantity(new BigDecimal("10")).avgCost(new BigDecimal("100.00"))
                .build();

        when(portfolioRepository.findByIdAndUserId(id, userId)).thenReturn(Optional.of(portfolio));
        when(portfolioAssetRepository.findByPortfolioId(id)).thenReturn(List.of(holding));

        PortfolioDetailResponse detail = portfolioService.getDetail(id, userId);

        // holdingsValue = 10 * 150 = 1500; totalValue = 200 (cash) + 1500 = 1700
        assertThat(detail.holdingsValue()).isEqualByComparingTo("1500.00");
        assertThat(detail.totalValue()).isEqualByComparingTo("1700.00");
        assertThat(detail.holdings()).hasSize(1);
        // unrealizedPnl = marketValue(1500) - costBasis(10*100=1000) = 500
        assertThat(detail.holdings().get(0).unrealizedPnl()).isEqualByComparingTo("500.00");
    }

    @Test
    void getMyPortfoliosReturnsZeroValueForEmptyPortfolio() {
        UUID userId = UUID.randomUUID();
        Account account = Account.builder().id(UUID.randomUUID()).build();
        Portfolio portfolio = Portfolio.builder().id(UUID.randomUUID()).account(account).name("Empty").build();

        when(portfolioRepository.findAllByUserId(userId)).thenReturn(List.of(portfolio));
        when(portfolioAssetRepository.findByPortfolioId(portfolio.getId())).thenReturn(List.of());

        List<PortfolioSummaryResponse> result = portfolioService.getMyPortfolios(userId);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).totalValue()).isEqualByComparingTo("0");
    }

    @Test
    void createDefaultPortfolioIsNamedMainPortfolio() {
        Account account = Account.builder().id(UUID.randomUUID()).build();
        when(portfolioRepository.save(any(Portfolio.class))).thenAnswer(inv -> inv.getArgument(0));

        Portfolio result = portfolioService.createDefaultPortfolio(account);

        assertThat(result.getName()).isEqualTo("Main Portfolio");
        assertThat(result.getAccount()).isEqualTo(account);
    }
}
