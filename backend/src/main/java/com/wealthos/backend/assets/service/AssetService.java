package com.wealthos.backend.assets.service;

import lombok.RequiredArgsConstructor;
import com.wealthos.backend.assets.dto.AssetResponse;
import com.wealthos.backend.assets.dto.CreateAssetRequest;
import com.wealthos.backend.assets.dto.UpdateAssetPriceRequest;
import com.wealthos.backend.assets.entity.Asset;
import com.wealthos.backend.assets.entity.AssetPriceHistory;
import com.wealthos.backend.assets.entity.AssetType;
import com.wealthos.backend.assets.mapper.AssetMapper;
import com.wealthos.backend.assets.repository.AssetPriceHistoryRepository;
import com.wealthos.backend.assets.repository.AssetRepository;
import com.wealthos.backend.common.exception.ConflictException;
import com.wealthos.backend.common.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AssetService {

    private final AssetRepository assetRepository;
    private final AssetMapper assetMapper;
    private final AssetPriceHistoryRepository assetPriceHistoryRepository;

    

    @Transactional(readOnly = true)
    public List<AssetResponse> getAll() {
        return assetRepository.findAll().stream()
                .map(assetMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public Asset getBySymbol(String symbol) {
        return assetRepository.findBySymbol(symbol).orElse(null);
    }

    @Transactional
    public Asset getOrCreateBySymbol(String symbol, String name, String assetType, String currency, BigDecimal price) {
        var existing = assetRepository.findBySymbol(symbol);
        if (existing.isPresent()) {
            return existing.get();
        }
        AssetType type = AssetType.STOCK;
        if (assetType != null && !assetType.isBlank()) {
            try {
                type = AssetType.valueOf(assetType.toUpperCase());
            } catch (Exception ignored) {}
        }
        Asset asset = Asset.builder()
                .symbol(symbol.toUpperCase())
                .name(name != null && !name.isBlank() ? name : symbol.toUpperCase())
                .assetType(type)
                .currency(currency != null && !currency.isBlank() ? currency.toUpperCase() : "USD")
                .currentPrice(price != null ? price : BigDecimal.ZERO)
                .priceUpdatedAt(Instant.now())
                .build();
        return assetRepository.save(asset);
    }

    public Asset getEntityById(UUID id) {
        return assetRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Asset", id));
    }

    @Transactional
    public AssetResponse create(CreateAssetRequest request) {
        if (assetRepository.existsBySymbolIgnoreCase(request.symbol())) {
            throw new ConflictException("An asset with symbol '%s' already exists".formatted(request.symbol()));
        }

        Asset asset = Asset.builder()
                .symbol(request.symbol().toUpperCase())
                .name(request.name())
                .assetType(request.assetType())
                .currency(request.currency().toUpperCase())
                .currentPrice(request.currentPrice())
                .priceUpdatedAt(Instant.now())
                .build();

        asset = assetRepository.save(asset);
        recordPriceHistory(asset.getId(), asset.getCurrentPrice());

        return assetMapper.toResponse(asset);
    }

    @Transactional
    public AssetResponse updatePrice(UUID id, UpdateAssetPriceRequest request) {
        Asset asset = getEntityById(id);
        asset.setCurrentPrice(request.currentPrice());
        asset.setPriceUpdatedAt(Instant.now());
        asset = assetRepository.save(asset);

        recordPriceHistory(asset.getId(), asset.getCurrentPrice());

        return assetMapper.toResponse(asset);
    }

    private void recordPriceHistory(UUID assetId, BigDecimal price) {
        AssetPriceHistory history = AssetPriceHistory.builder()
                .assetId(assetId)
                .price(price)
                .build();

        assetPriceHistoryRepository.save(history);
    }
}
