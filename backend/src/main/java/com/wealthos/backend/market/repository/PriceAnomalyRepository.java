package com.wealthos.backend.market.repository;

import com.wealthos.backend.market.entity.PriceAnomaly;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface PriceAnomalyRepository extends JpaRepository<PriceAnomaly, UUID> {
    List<PriceAnomaly> findTop20ByAssetIdOrderByDetectedAtDesc(UUID assetId);
}
