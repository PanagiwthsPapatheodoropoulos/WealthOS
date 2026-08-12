package com.wealthos.backend.portfolios.service;

import lombok.RequiredArgsConstructor;
import com.wealthos.backend.accounts.entity.Account;
import com.wealthos.backend.accounts.repository.AccountRepository;
import com.wealthos.backend.common.exception.ResourceNotFoundException;
import com.wealthos.backend.portfolios.dto.CreatePortfolioRequest;
import com.wealthos.backend.portfolios.dto.PortfolioDetailResponse;
import com.wealthos.backend.portfolios.dto.PortfolioHoldingResponse;
import com.wealthos.backend.portfolios.dto.PortfolioSummaryResponse;
import com.wealthos.backend.portfolios.entity.Portfolio;
import com.wealthos.backend.portfolios.entity.PortfolioAsset;
import com.wealthos.backend.portfolios.repository.PortfolioAssetRepository;
import com.wealthos.backend.portfolios.repository.PortfolioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.wealthos.backend.assets.entity.Asset;
import com.wealthos.backend.assets.entity.AssetType;
import com.wealthos.backend.assets.repository.AssetRepository;
import com.wealthos.backend.portfolios.dto.ImportPositionRequest;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PortfolioService {

    private final PortfolioRepository portfolioRepository;
    private final PortfolioAssetRepository portfolioAssetRepository;
    private final AccountRepository accountRepository;
    private final AssetRepository assetRepository;

    @Transactional(readOnly = true)
    public Portfolio getEntityByIdAndUser(UUID id, UUID userId) {
        return portfolioRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Portfolio", id));
    }

    @Transactional(readOnly = true)
    public List<PortfolioSummaryResponse> getMyPortfolios(UUID userId) {
        List<Portfolio> portfolios = portfolioRepository.findAllByUserId(userId);
        if (portfolios.isEmpty()) {
            return List.of();
        }

        List<UUID> portfolioIds = portfolios.stream().map(Portfolio::getId).toList();
        List<PortfolioAsset> allHoldings = portfolioAssetRepository.findByPortfolioIdIn(portfolioIds);

        Map<UUID, BigDecimal> valueByPortfolio = allHoldings.stream()
                .collect(Collectors.groupingBy(
                        pa -> pa.getPortfolio().getId(),
                        Collectors.reducing(
                                BigDecimal.ZERO,
                                pa -> pa.getQuantity().multiply(pa.getAsset().getCurrentPrice()),
                                BigDecimal::add
                        )
                ));

        return portfolios.stream()
                .map(portfolio -> new PortfolioSummaryResponse(
                        portfolio.getId(),
                        portfolio.getAccount().getId(),
                        portfolio.getName(),
                        valueByPortfolio.getOrDefault(portfolio.getId(), BigDecimal.ZERO),
                        portfolio.getCreatedAt()
                ))
                .toList();
    }

    @Transactional
    public PortfolioSummaryResponse create(UUID userId, CreatePortfolioRequest request) {
        Account account = accountRepository.findByIdAndUserId(request.accountId(), userId)
                .orElseThrow(() -> new ResourceNotFoundException("Account", request.accountId()));

        Portfolio portfolio = Portfolio.builder()
                .account(account)
                .name(request.name())
                .build();

        portfolio = portfolioRepository.save(portfolio);

        return new PortfolioSummaryResponse(
                portfolio.getId(),
                account.getId(),
                portfolio.getName(),
                BigDecimal.ZERO,
                portfolio.getCreatedAt()
        );
    }

    @Transactional
    public Portfolio createDefaultPortfolio(Account account) {
        Portfolio portfolio = Portfolio.builder()
                .account(account)
                .name("Main Portfolio")
                .build();

        return portfolioRepository.save(portfolio);
    }

    @Transactional(readOnly = true)
    public PortfolioDetailResponse getDetail(UUID id, UUID userId) {
        Portfolio portfolio = getEntityByIdAndUser(id, userId);
        List<PortfolioAsset> holdings = portfolioAssetRepository.findByPortfolioId(portfolio.getId());

        List<PortfolioHoldingResponse> holdingResponses = holdings.stream()
                .map(this::toHoldingResponse)
                .toList();

        BigDecimal holdingsValue = holdingResponses.stream()
                .map(PortfolioHoldingResponse::marketValue)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal cashBalance = portfolio.getAccount().getCashBalance();

        return new PortfolioDetailResponse(
                portfolio.getId(),
                portfolio.getAccount().getId(),
                portfolio.getName(),
                cashBalance,
                holdingsValue,
                cashBalance.add(holdingsValue),
                holdingResponses,
                portfolio.getCreatedAt()
        );
    }

    public void evictDetailCache(UUID id, UUID userId) {
    }

    @Transactional
    public void importBrokerHoldings(UUID portfolioId, UUID userId, List<ImportPositionRequest> positions) {
        Portfolio portfolio = getEntityByIdAndUser(portfolioId, userId);
        Set<UUID> activeSyncedAssetIds = new HashSet<>();

        if (positions != null) {
            for (ImportPositionRequest pos : positions) {
                if (pos.quantity() == null || pos.quantity().compareTo(BigDecimal.ZERO) <= 0) {
                    continue;
                }

                String sym = pos.symbol().toUpperCase().trim();
                Asset asset = assetRepository.findBySymbol(sym).orElseGet(() -> {
                    AssetType type = (sym.contains("VUAA") || sym.contains("VWCE") || sym.contains("SMH")
                            || sym.contains("WNUC") || sym.contains("WQTM") || sym.contains("A1P0")
                            || sym.contains("A1PO") || sym.contains("BOTZ") || sym.contains("KBOT"))
                            ? AssetType.ETF
                            : AssetType.STOCK;

                    Asset newAsset = Asset.builder()
                            .symbol(sym)
                            .name(pos.name() != null && !pos.name().isBlank() ? pos.name() : sym)
                            .assetType(type)
                            .currency("EUR")
                            .currentPrice(pos.currentPrice() != null ? pos.currentPrice() : pos.averagePrice())
                            .priceUpdatedAt(Instant.now())
                            .build();
                    return assetRepository.save(newAsset);
                });

                // Update asset price and name if available
                if (pos.currentPrice() != null && pos.currentPrice().compareTo(BigDecimal.ZERO) > 0) {
                    asset.setCurrentPrice(pos.currentPrice());
                    asset.setPriceUpdatedAt(Instant.now());
                    if (pos.name() != null && !pos.name().isBlank() && (asset.getName() == null || asset.getName().equals(sym))) {
                        asset.setName(pos.name());
                    }
                    assetRepository.save(asset);
                }

                PortfolioAsset holding = portfolioAssetRepository
                        .findByPortfolioIdAndAssetId(portfolio.getId(), asset.getId())
                        .orElseGet(() -> PortfolioAsset.builder()
                                .portfolio(portfolio)
                                .asset(asset)
                                .quantity(BigDecimal.ZERO)
                                .avgCost(BigDecimal.ZERO)
                                .build());

                holding.setQuantity(pos.quantity());
                holding.setAvgCost(pos.averagePrice());
                portfolioAssetRepository.save(holding);
                activeSyncedAssetIds.add(asset.getId());
            }
        }

        // Full broker sync reconciliation:
        // Automatically prune any positions that were sold or closed on the broker
        List<PortfolioAsset> existingHoldings = portfolioAssetRepository.findByPortfolioId(portfolio.getId());
        for (PortfolioAsset existing : existingHoldings) {
            if (!activeSyncedAssetIds.contains(existing.getAsset().getId())) {
                portfolioAssetRepository.delete(existing);
            }
        }
    }

    @Transactional
    public void deleteHolding(UUID portfolioId, UUID userId, UUID assetId) {
        Portfolio portfolio = getEntityByIdAndUser(portfolioId, userId);
        portfolioAssetRepository.findByPortfolioIdAndAssetId(portfolio.getId(), assetId)
                .ifPresent(portfolioAssetRepository::delete);
    }

    @Transactional
    public void deleteHoldingBySymbol(UUID portfolioId, UUID userId, String symbol) {
        Portfolio portfolio = getEntityByIdAndUser(portfolioId, userId);
        assetRepository.findBySymbol(symbol.toUpperCase().trim())
                .flatMap(asset -> portfolioAssetRepository.findByPortfolioIdAndAssetId(portfolio.getId(), asset.getId()))
                .ifPresent(portfolioAssetRepository::delete);
    }

    @Transactional
    public void clearHoldings(UUID portfolioId, UUID userId) {
        Portfolio portfolio = getEntityByIdAndUser(portfolioId, userId);
        portfolioAssetRepository.deleteByPortfolioId(portfolio.getId());
    }

    @Transactional
    public void resetAllForUser(UUID userId) {
        List<Portfolio> portfolios = portfolioRepository.findAllByUserId(userId);
        for (Portfolio p : portfolios) {
            portfolioAssetRepository.deleteByPortfolioId(p.getId());
        }
    }

    private PortfolioHoldingResponse toHoldingResponse(PortfolioAsset pa) {
        BigDecimal marketValue = pa.getQuantity().multiply(pa.getAsset().getCurrentPrice());
        BigDecimal costBasis = pa.getQuantity().multiply(pa.getAvgCost());
        BigDecimal unrealizedPnl = marketValue.subtract(costBasis);

        return new PortfolioHoldingResponse(
                pa.getAsset().getId(),
                pa.getAsset().getSymbol(),
                pa.getAsset().getName(),
                pa.getQuantity(),
                pa.getAvgCost(),
                pa.getAsset().getCurrentPrice(),
                marketValue,
                unrealizedPnl
        );
    }
}
