package com.wealthos.backend.watchlists.repository;

import com.wealthos.backend.watchlists.entity.WatchlistItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface WatchlistItemRepository extends JpaRepository<WatchlistItem, UUID> {

    @Query("SELECT wi FROM WatchlistItem wi JOIN FETCH wi.asset WHERE wi.watchlist.id = :watchlistId")
    List<WatchlistItem> findByWatchlistId(@Param("watchlistId") UUID watchlistId);

    @Query("SELECT wi FROM WatchlistItem wi JOIN FETCH wi.asset WHERE wi.watchlist.id IN :watchlistIds")
    List<WatchlistItem> findByWatchlistIdIn(@Param("watchlistIds") List<UUID> watchlistIds);

    Optional<WatchlistItem> findByWatchlistIdAndAssetId(UUID watchlistId, UUID assetId);

    boolean existsByWatchlistIdAndAssetId(UUID watchlistId, UUID assetId);

    void deleteByWatchlistId(UUID watchlistId);
}
