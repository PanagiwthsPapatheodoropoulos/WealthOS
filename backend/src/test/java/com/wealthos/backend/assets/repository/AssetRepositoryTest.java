package com.wealthos.backend.assets.repository;

import com.wealthos.backend.assets.entity.Asset;
import com.wealthos.backend.assets.entity.AssetType;
import com.wealthos.backend.support.AbstractIntegrationTest;
import jakarta.persistence.PersistenceException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AssetRepositoryTest extends AbstractIntegrationTest {

    @Autowired
    private AssetRepository assetRepository;

    @Test
    void findBySymbolIgnoreCaseIsCaseInsensitive() {
        assetRepository.save(Asset.builder()
                .symbol("AAPL").name("Apple Inc.").assetType(AssetType.STOCK)
                .currency("USD").currentPrice(new BigDecimal("195.50")).build());

        assertThat(assetRepository.findBySymbolIgnoreCase("aapl")).isPresent();
        assertThat(assetRepository.existsBySymbolIgnoreCase("AaPl")).isTrue();
        assertThat(assetRepository.existsBySymbolIgnoreCase("MSFT")).isFalse();
    }

    @Test
    void uniqueSymbolConstraintIsEnforcedAtDatabaseLevel() {
        assetRepository.saveAndFlush(Asset.builder()
                .symbol("BTC").name("Bitcoin").assetType(AssetType.CRYPTO)
                .currency("USD").currentPrice(new BigDecimal("60000")).build());

        assertThatThrownBy(() -> assetRepository.saveAndFlush(Asset.builder()
                .symbol("BTC").name("Bitcoin Duplicate").assetType(AssetType.CRYPTO)
                .currency("USD").currentPrice(new BigDecimal("61000")).build()))
                .isInstanceOfAny(DataIntegrityViolationException.class, PersistenceException.class);
    }
}
