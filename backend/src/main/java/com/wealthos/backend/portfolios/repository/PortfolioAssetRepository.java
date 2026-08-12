package com.wealthos.backend.portfolios.repository;

import com.wealthos.backend.portfolios.entity.PortfolioAsset;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PortfolioAssetRepository extends JpaRepository<PortfolioAsset, UUID> {

    @Query("SELECT pa FROM PortfolioAsset pa JOIN FETCH pa.asset WHERE pa.portfolio.id = :portfolioId")
    List<PortfolioAsset> findByPortfolioId(@Param("portfolioId") UUID portfolioId);

    @Query("SELECT pa FROM PortfolioAsset pa JOIN FETCH pa.asset WHERE pa.portfolio.id IN :portfolioIds")
    List<PortfolioAsset> findByPortfolioIdIn(@Param("portfolioIds") List<UUID> portfolioIds);

    @Query("SELECT pa FROM PortfolioAsset pa JOIN FETCH pa.asset WHERE pa.portfolio.id = :portfolioId AND pa.asset.id = :assetId")
    Optional<PortfolioAsset> findByPortfolioIdAndAssetId(@Param("portfolioId") UUID portfolioId, @Param("assetId") UUID assetId);

    void deleteByPortfolioId(UUID portfolioId);
}
