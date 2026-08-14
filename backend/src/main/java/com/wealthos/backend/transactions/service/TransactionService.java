package com.wealthos.backend.transactions.service;

import lombok.RequiredArgsConstructor;
import com.wealthos.backend.accounts.entity.Account;
import com.wealthos.backend.assets.entity.Asset;
import com.wealthos.backend.assets.service.AssetService;
import com.wealthos.backend.common.events.WealthEventPublisher;
import com.wealthos.backend.common.exception.BusinessRuleException;
import com.wealthos.backend.portfolios.entity.Portfolio;
import com.wealthos.backend.portfolios.entity.PortfolioAsset;
import com.wealthos.backend.portfolios.repository.PortfolioAssetRepository;
import com.wealthos.backend.portfolios.service.PortfolioService;
import com.wealthos.backend.transactions.dto.BuyRequest;
import com.wealthos.backend.transactions.dto.SellRequest;
import com.wealthos.backend.transactions.dto.TransactionEventResponse;
import com.wealthos.backend.transactions.dto.TransactionResponse;
import com.wealthos.backend.transactions.entity.Transaction;
import com.wealthos.backend.transactions.entity.TransactionType;
import com.wealthos.backend.transactions.mapper.TransactionMapper;
import com.wealthos.backend.transactions.repository.TransactionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TransactionService {

    private final PortfolioService portfolioService;
    private final PortfolioAssetRepository portfolioAssetRepository;
    private final AssetService assetService;
    private final TransactionRepository transactionRepository;
    private final TransactionMapper transactionMapper;
    private final TransactionEventStore transactionEventStore;
    private final WealthEventPublisher wealthEventPublisher;

    

    @Transactional
    public TransactionResponse buy(UUID userId, BuyRequest request) {
        Portfolio portfolio = portfolioService.getEntityByIdAndUser(request.portfolioId(), userId);
        Asset asset = assetService.getEntityById(request.assetId());
        Account account = portfolio.getAccount();

        BigDecimal totalCost = request.quantity().multiply(asset.getCurrentPrice());

        if (account.getCashBalance().compareTo(totalCost) < 0) {
            throw new BusinessRuleException("Insufficient cash balance to complete this purchase");
        }

        account.setCashBalance(account.getCashBalance().subtract(totalCost));

        PortfolioAsset holding = portfolioAssetRepository
                .findByPortfolioIdAndAssetId(portfolio.getId(), asset.getId())
                .orElseGet(() -> PortfolioAsset.builder()
                        .portfolio(portfolio)
                        .asset(asset)
                        .quantity(BigDecimal.ZERO)
                        .avgCost(BigDecimal.ZERO)
                        .build());

        BigDecimal newQuantity = holding.getQuantity().add(request.quantity());
        BigDecimal existingCost = holding.getQuantity().multiply(holding.getAvgCost());
        BigDecimal newAvgCost = existingCost.add(totalCost).divide(newQuantity, 6, RoundingMode.HALF_UP);

        holding.setQuantity(newQuantity);
        holding.setAvgCost(newAvgCost);
        portfolioAssetRepository.save(holding);

        Transaction transaction = Transaction.builder()
                .portfolio(portfolio)
                .asset(asset)
                .type(TransactionType.BUY)
                .quantity(request.quantity())
                .price(asset.getCurrentPrice())
                .totalAmount(totalCost)
                .build();

        transaction = transactionRepository.save(transaction);

        // Event Store audit log
        transactionEventStore.append(
                transaction.getId(),
                userId,
                portfolio.getId(),
                "TRANSACTION_BOUGHT",
                Map.of(
                        "symbol", asset.getSymbol(),
                        "quantity", request.quantity(),
                        "price", asset.getCurrentPrice(),
                        "totalCost", totalCost
                )
        );

        // Async Event Publishing
        wealthEventPublisher.publishTransactionExecuted(
                userId,
                asset.getSymbol(),
                TransactionType.BUY,
                request.quantity(),
                totalCost
        );

        return transactionMapper.toResponse(transaction);
    }

    @Transactional
    public TransactionResponse sell(UUID userId, SellRequest request) {
        Portfolio portfolio = portfolioService.getEntityByIdAndUser(request.portfolioId(), userId);
        Asset asset = assetService.getEntityById(request.assetId());
        Account account = portfolio.getAccount();

        PortfolioAsset holding = portfolioAssetRepository
                .findByPortfolioIdAndAssetId(portfolio.getId(), asset.getId())
                .orElseThrow(() -> new BusinessRuleException(
                        "You do not hold any '%s' in this portfolio".formatted(asset.getSymbol())));

        if (holding.getQuantity().compareTo(request.quantity()) < 0) {
            throw new BusinessRuleException(
                    "Cannot sell more '%s' than currently held".formatted(asset.getSymbol()));
        }

        BigDecimal proceeds = request.quantity().multiply(asset.getCurrentPrice());
        BigDecimal costBasis = request.quantity().multiply(holding.getAvgCost());
        BigDecimal realizedPnl = proceeds.subtract(costBasis);

        BigDecimal remainingQuantity = holding.getQuantity().subtract(request.quantity());
        if (remainingQuantity.compareTo(BigDecimal.ZERO) == 0) {
            portfolioAssetRepository.delete(holding);
        } else {
            holding.setQuantity(remainingQuantity);
            portfolioAssetRepository.save(holding);
        }

        account.setCashBalance(account.getCashBalance().add(proceeds));

        Transaction transaction = Transaction.builder()
                .portfolio(portfolio)
                .asset(asset)
                .type(TransactionType.SELL)
                .quantity(request.quantity())
                .price(asset.getCurrentPrice())
                .totalAmount(proceeds)
                .realizedPnl(realizedPnl)
                .build();

        transaction = transactionRepository.save(transaction);

        // Event Store audit log
        transactionEventStore.append(
                transaction.getId(),
                userId,
                portfolio.getId(),
                "TRANSACTION_SOLD",
                Map.of(
                        "symbol", asset.getSymbol(),
                        "quantity", request.quantity(),
                        "price", asset.getCurrentPrice(),
                        "proceeds", proceeds,
                        "realizedPnl", realizedPnl
                )
        );

        // Async Event Publishing
        wealthEventPublisher.publishTransactionExecuted(
                userId,
                asset.getSymbol(),
                TransactionType.SELL,
                request.quantity(),
                proceeds
        );

        return transactionMapper.toResponse(transaction);
    }

    @Transactional(readOnly = true)
    public List<TransactionResponse> listForPortfolio(UUID userId, UUID portfolioId) {
        portfolioService.getEntityByIdAndUser(portfolioId, userId);
        return transactionRepository.findByPortfolioIdOrderByExecutedAtDesc(portfolioId).stream()
                .map(transactionMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TransactionEventResponse> getEventLog(UUID transactionId, UUID userId) {
        return transactionEventStore.findByTransactionIdOrderByOccurredAtAsc(transactionId).stream()
                .filter(e -> e.getUserId().equals(userId))
                .map(e -> new TransactionEventResponse(e.getId(), e.getEventType(), e.getPayload(), e.getOccurredAt()))
                .toList();
    }
}
