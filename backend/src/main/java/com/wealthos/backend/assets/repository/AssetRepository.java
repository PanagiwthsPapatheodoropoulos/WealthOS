package com.wealthos.backend.assets.repository;

import com.wealthos.backend.assets.entity.Asset;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface AssetRepository extends JpaRepository<Asset, UUID> {
    Optional<Asset> findBySymbol(String symbol);
    Optional<Asset> findBySymbolIgnoreCase(String symbol);
    boolean existsBySymbol(String symbol);
    boolean existsBySymbolIgnoreCase(String symbol);
}
