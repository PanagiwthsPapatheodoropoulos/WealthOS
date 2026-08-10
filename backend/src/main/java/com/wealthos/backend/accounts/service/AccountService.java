package com.wealthos.backend.accounts.service;

import com.wealthos.backend.accounts.dto.AccountResponse;
import com.wealthos.backend.accounts.dto.CreateAccountRequest;
import com.wealthos.backend.accounts.entity.Account;
import com.wealthos.backend.accounts.entity.AccountType;
import com.wealthos.backend.accounts.mapper.AccountMapper;
import com.wealthos.backend.accounts.repository.AccountRepository;
import com.wealthos.backend.common.exception.BusinessRuleException;
import com.wealthos.backend.common.exception.ResourceNotFoundException;
import com.wealthos.backend.users.entity.User;
import com.wealthos.backend.users.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
public class AccountService {

    private static final BigDecimal DEFAULT_INITIAL_BALANCE = BigDecimal.ZERO;

    private final AccountRepository accountRepository;
    private final AccountMapper accountMapper;
    private final UserRepository userRepository;

    public AccountService(AccountRepository accountRepository, AccountMapper accountMapper) {
        this.accountRepository = accountRepository;
        this.accountMapper = accountMapper;
        this.userRepository = null;
    }

    @Autowired
    public AccountService(AccountRepository accountRepository, AccountMapper accountMapper, UserRepository userRepository) {
        this.accountRepository = accountRepository;
        this.accountMapper = accountMapper;
        this.userRepository = userRepository;
    }

    

    @Transactional(readOnly = true)
    public List<AccountResponse> getMyAccounts(UUID userId) {
        return accountRepository.findByUserId(userId).stream()
                .map(accountMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public Account getEntityByIdAndUser(UUID id, UUID userId) {
        return accountRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Account", id));
    }

    @Transactional
    public AccountResponse create(UUID userId, CreateAccountRequest request) {
        var userRef = userRepository.getReferenceById(userId);
        return create(userId, userRef, request);
    }

    @Transactional
    public AccountResponse create(UUID userId, User userRef, CreateAccountRequest request) {
        Account account = Account.builder()
                .user(userRef)
                .name(request.name())
                .accountType(request.accountType())
                .currency(request.currency().toUpperCase())
                .cashBalance(BigDecimal.ZERO)
                .build();

        return accountMapper.toResponse(accountRepository.save(account));
    }

    /**
     */
    @Transactional
    public Account createDefaultCashAccount(User user) {
        Account account = Account.builder()
                .user(user)
                .name("Main Account")
                .accountType(AccountType.CASH)
                .currency("USD")
                .cashBalance(DEFAULT_INITIAL_BALANCE)
                .build();

        return accountRepository.save(account);
    }

    @Transactional
    public AccountResponse deposit(UUID accountId, UUID userId, BigDecimal amount) {
        Account account = getEntityByIdAndUser(accountId, userId);
        account.setCashBalance(account.getCashBalance().add(amount));
        return accountMapper.toResponse(accountRepository.save(account));
    }

    @Transactional
    public AccountResponse withdraw(UUID accountId, UUID userId, BigDecimal amount) {
        Account account = getEntityByIdAndUser(accountId, userId);

        if (account.getCashBalance().compareTo(amount) < 0) {
            throw new BusinessRuleException("Insufficient balance for this withdrawal");
        }

        account.setCashBalance(account.getCashBalance().subtract(amount));
        return accountMapper.toResponse(accountRepository.save(account));
    }
}
