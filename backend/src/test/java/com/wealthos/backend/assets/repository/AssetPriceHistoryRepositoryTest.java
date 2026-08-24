package com.wealthos.backend.assets.repository;

import com.wealthos.backend.support.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import static org.assertj.core.api.Assertions.assertThat;

class AssetPriceHistoryRepositoryTest extends AbstractIntegrationTest {

    @Autowired
    private AssetPriceHistoryRepository assetPriceHistoryRepository;

    @Test
    void repositoryLoads() {
        assertThat(assetPriceHistoryRepository).isNotNull();
    }
}
