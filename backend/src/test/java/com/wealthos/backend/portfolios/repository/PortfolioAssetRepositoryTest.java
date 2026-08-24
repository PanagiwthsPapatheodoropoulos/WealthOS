package com.wealthos.backend.portfolios.repository;

import com.wealthos.backend.accounts.entity.Account;
import com.wealthos.backend.accounts.entity.AccountType;
import com.wealthos.backend.accounts.repository.AccountRepository;
import com.wealthos.backend.assets.entity.Asset;
import com.wealthos.backend.assets.entity.AssetType;
import com.wealthos.backend.assets.repository.AssetRepository;
import com.wealthos.backend.portfolios.entity.Portfolio;
import com.wealthos.backend.portfolios.entity.PortfolioAsset;
import com.wealthos.backend.support.AbstractIntegrationTest;
import com.wealthos.backend.users.enums.Role;
import com.wealthos.backend.users.entity.User;
import com.wealthos.backend.users.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class PortfolioAssetRepositoryTest extends AbstractIntegrationTest {

    @Autowired private PortfolioAssetRepository portfolioAssetRepository;
    @Autowired private PortfolioRepository portfolioRepository;
    @Autowired private AccountRepository accountRepository;
    @Autowired private AssetRepository assetRepository;
    @Autowired private UserRepository userRepository;

    @Test
    void findByPortfolioIdAndAssetIdReturnsExistingHolding() {
        User user = userRepository.save(User.builder()
                .email("holder@example.com").passwordHash("h").firstName("H").lastName("O").role(Role.USER).build());
        Account account = accountRepository.save(Account.builder()
                .user(user).name("Main").accountType(AccountType.CASH).currency("USD").cashBalance(BigDecimal.ZERO).build());
        Portfolio portfolio = portfolioRepository.save(Portfolio.builder().account(account).name("Main").build());
        Asset asset = assetRepository.save(Asset.builder()
                .symbol("ETH").name("Ethereum").assetType(AssetType.CRYPTO).currency("USD")
                .currentPrice(new BigDecimal("3000")).build());

        portfolioAssetRepository.save(PortfolioAsset.builder()
                .portfolio(portfolio).asset(asset)
                .quantity(new BigDecimal("2")).avgCost(new BigDecimal("2800")).build());

        assertThat(portfolioAssetRepository.findByPortfolioIdAndAssetId(portfolio.getId(), asset.getId())).isPresent();
        assertThat(portfolioAssetRepository.findByPortfolioId(portfolio.getId())).hasSize(1);
    }

    @Test
    void uniquePortfolioAssetConstraintPreventsDuplicateHoldingRows() {
        User user = userRepository.save(User.builder()
                .email("dupholder@example.com").passwordHash("h").firstName("H").lastName("O").role(Role.USER).build());
        Account account = accountRepository.save(Account.builder()
                .user(user).name("Main").accountType(AccountType.CASH).currency("USD").cashBalance(BigDecimal.ZERO).build());
        Portfolio portfolio = portfolioRepository.save(Portfolio.builder().account(account).name("Main").build());
        Asset asset = assetRepository.save(Asset.builder()
                .symbol("SOL").name("Solana").assetType(AssetType.CRYPTO).currency("USD")
                .currentPrice(new BigDecimal("150")).build());

        portfolioAssetRepository.saveAndFlush(PortfolioAsset.builder()
                .portfolio(portfolio).asset(asset).quantity(BigDecimal.ONE).avgCost(BigDecimal.TEN).build());

        org.assertj.core.api.Assertions.assertThatThrownBy(() ->
                portfolioAssetRepository.saveAndFlush(PortfolioAsset.builder()
                        .portfolio(portfolio).asset(asset).quantity(BigDecimal.ONE).avgCost(BigDecimal.TEN).build())
        ).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
    }
}
