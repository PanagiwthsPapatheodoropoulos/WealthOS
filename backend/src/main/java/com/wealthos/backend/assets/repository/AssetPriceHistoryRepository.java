package com.wealthos.backend.assets.repository;

import com.wealthos.backend.assets.entity.AssetPriceHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface AssetPriceHistoryRepository extends JpaRepository<AssetPriceHistory, UUID> {

    List<AssetPriceHistory> findByAssetIdAndRecordedAtGreaterThanEqualOrderByRecordedAtAsc(
            UUID assetId, Instant since);

    @Query(value = """
        WITH price_lags AS (
            SELECT price,
                   LAG(price) OVER (ORDER BY recorded_at ASC) AS prev_price
            FROM asset_price_history
            WHERE asset_id = :assetId
        )
        SELECT ((price - prev_price) / prev_price) AS dailyReturn
        FROM price_lags
        WHERE prev_price IS NOT NULL
        """, nativeQuery = true)
    List<Double> findDailyReturns(@Param("assetId") UUID assetId);
}
