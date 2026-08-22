package com.wealthos.backend.analytics.repository;

import com.wealthos.backend.analytics.entity.PortfolioPerformanceSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PortfolioPerformanceSnapshotRepository extends JpaRepository<PortfolioPerformanceSnapshot, UUID> {
    List<PortfolioPerformanceSnapshot> findByPortfolioIdAndSnapshotDateGreaterThanEqualOrderBySnapshotDateAsc(
            UUID portfolioId, LocalDate since);
    Optional<PortfolioPerformanceSnapshot> findByPortfolioIdAndSnapshotDate(UUID portfolioId, LocalDate snapshotDate);
}
