package com.wealthos.backend.portfolios.repository;

import com.wealthos.backend.accounts.entity.Account;
import com.wealthos.backend.accounts.entity.AccountType;
import com.wealthos.backend.accounts.repository.AccountRepository;
import com.wealthos.backend.portfolios.entity.Portfolio;
import com.wealthos.backend.support.AbstractIntegrationTest;
import com.wealthos.backend.users.enums.Role;
import com.wealthos.backend.users.entity.User;
import com.wealthos.backend.users.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.math.BigDecimal;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class PortfolioRepositoryTest extends AbstractIntegrationTest {

    @Autowired private PortfolioRepository portfolioRepository;
    @Autowired private AccountRepository accountRepository;
    @Autowired private UserRepository userRepository;

    @Test
    void findAllByUserIdOnlyReturnsPortfoliosOwnedByThatUser() {
        User owner = userRepository.save(User.builder()
                .email("owner@example.com").passwordHash("h").firstName("O").lastName("W").role(Role.USER).build());
        User other = userRepository.save(User.builder()
                .email("other@example.com").passwordHash("h").firstName("O").lastName("T").role(Role.USER).build());

        Account ownerAccount = accountRepository.save(Account.builder()
                .user(owner).name("Main").accountType(AccountType.CASH).currency("USD").cashBalance(BigDecimal.ZERO).build());
        Account otherAccount = accountRepository.save(Account.builder()
                .user(other).name("Main").accountType(AccountType.CASH).currency("USD").cashBalance(BigDecimal.ZERO).build());

        portfolioRepository.save(Portfolio.builder().account(ownerAccount).name("Owner Portfolio").build());
        portfolioRepository.save(Portfolio.builder().account(otherAccount).name("Other Portfolio").build());

        var result = portfolioRepository.findAllByUserId(owner.getId());

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getName()).isEqualTo("Owner Portfolio");
    }

    @Test
    void findByIdAndUserIdReturnsEmptyWhenPortfolioBelongsToAnotherUser() {
        User owner = userRepository.save(User.builder()
                .email("a@example.com").passwordHash("h").firstName("A").lastName("A").role(Role.USER).build());
        User intruder = userRepository.save(User.builder()
                .email("b@example.com").passwordHash("h").firstName("B").lastName("B").role(Role.USER).build());

        Account account = accountRepository.save(Account.builder()
                .user(owner).name("Main").accountType(AccountType.CASH).currency("USD").cashBalance(BigDecimal.ZERO).build());
        Portfolio portfolio = portfolioRepository.save(Portfolio.builder().account(account).name("Private").build());

        assertThat(portfolioRepository.findByIdAndUserId(portfolio.getId(), intruder.getId())).isEmpty();
        assertThat(portfolioRepository.findByIdAndUserId(portfolio.getId(), owner.getId())).isPresent();
    }
}
