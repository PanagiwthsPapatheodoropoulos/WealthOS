package com.wealthos.backend.accounts.service;

import com.wealthos.backend.accounts.entity.Account;
import com.wealthos.backend.accounts.mapper.AccountMapper;
import com.wealthos.backend.accounts.repository.AccountRepository;
import com.wealthos.backend.common.exception.BusinessRuleException;
import com.wealthos.backend.common.exception.ResourceNotFoundException;
import com.wealthos.backend.users.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AccountServiceTest {

    @Mock
    private AccountRepository accountRepository;
    @Mock
    private AccountMapper accountMapper;
    @Mock
    private UserRepository userRepository;

    private AccountService accountService;

    @BeforeEach
    void setUp() {
        accountService = new AccountService(accountRepository, accountMapper, userRepository);
    }

    @Test
    void withdrawFailsWhenBalanceInsufficient() {
        UUID accountId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        Account account = Account.builder().id(accountId).cashBalance(new BigDecimal("50.00")).build();
        when(accountRepository.findByIdAndUserId(accountId, userId)).thenReturn(Optional.of(account));

        assertThatThrownBy(() -> accountService.withdraw(accountId, userId, new BigDecimal("100.00")))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("Insufficient balance");
    }

    @Test
    void withdrawSucceedsAndReducesBalance() {
        UUID accountId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        Account account = Account.builder().id(accountId).cashBalance(new BigDecimal("100.00")).build();
        when(accountRepository.findByIdAndUserId(accountId, userId)).thenReturn(Optional.of(account));
        when(accountRepository.save(any(Account.class))).thenAnswer(inv -> inv.getArgument(0));

        accountService.withdraw(accountId, userId, new BigDecimal("40.00"));

        assertThat(account.getCashBalance()).isEqualByComparingTo("60.00");
    }

    @Test
    void depositIncreasesBalance() {
        UUID accountId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        Account account = Account.builder().id(accountId).cashBalance(new BigDecimal("10.00")).build();
        when(accountRepository.findByIdAndUserId(accountId, userId)).thenReturn(Optional.of(account));
        when(accountRepository.save(any(Account.class))).thenAnswer(inv -> inv.getArgument(0));

        accountService.deposit(accountId, userId, new BigDecimal("5.00"));

        assertThat(account.getCashBalance()).isEqualByComparingTo("15.00");
    }

    @Test
    void getEntityByIdAndUserThrowsWhenNotOwned() {
        UUID accountId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        when(accountRepository.findByIdAndUserId(accountId, userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> accountService.getEntityByIdAndUser(accountId, userId))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void createDefaultCashAccountStartsWithZeroBalance() {
        when(accountRepository.save(any(Account.class))).thenAnswer(inv -> inv.getArgument(0));

        Account account = accountService.createDefaultCashAccount(
                com.wealthos.backend.users.entity.User.builder().id(UUID.randomUUID()).build());

        assertThat(account.getCashBalance()).isEqualByComparingTo("0.00");
        assertThat(account.getName()).isEqualTo("Main Account");
    }
}
