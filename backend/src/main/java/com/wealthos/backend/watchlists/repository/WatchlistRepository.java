package com.wealthos.backend.watchlists.repository;

import com.wealthos.backend.watchlists.entity.Watchlist;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface WatchlistRepository extends JpaRepository<Watchlist, UUID> {

    List<Watchlist> findByUserId(UUID userId);

    Optional<Watchlist> findByIdAndUserId(UUID id, UUID userId);
}
