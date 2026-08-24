package com.wealthos.backend.transactions.service;

import com.wealthos.backend.accounts.repository.AccountRepository;
import com.wealthos.backend.assets.repository.AssetRepository;
import com.wealthos.backend.common.events.WealthEventPublisher;
import com.wealthos.backend.common.lock.DistributedLockService;
import com.wealthos.backend.portfolios.repository.PortfolioAssetRepository;
import com.wealthos.backend.portfolios.repository.PortfolioRepository;
import com.wealthos.backend.transactions.mapper.TransactionMapper;
import com.wealthos.backend.transactions.repository.TransactionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(MockitoExtension.class)
class TransactionServiceTest {

    @Mock private TransactionRepository transactionRepository;
    @Mock private AccountRepository accountRepository;
    @Mock private PortfolioRepository portfolioRepository;
    @Mock private PortfolioAssetRepository portfolioAssetRepository;
    @Mock private AssetRepository assetRepository;
    @Mock private TransactionMapper transactionMapper;
    @Mock private DistributedLockService lockService;
    @Mock private WealthEventPublisher eventPublisher;

    @InjectMocks private TransactionService transactionService;

    @Test
    void serviceLoads() {
        assertThat(transactionService).isNotNull();
    }
}
