package com.wealthos.backend.analytics.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "portfolio_performance_snapshots")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PortfolioPerformanceSnapshot {

    @Id
    @Column(name = "portfolio_id", nullable = false)
    private UUID portfolioId;

    @Column(name = "snapshot_date", nullable = false)
    private LocalDate snapshotDate;

    @Column(name = "total_value", precision = 19, scale = 4, nullable = false)
    private BigDecimal totalValue;

    @Column(name = "daily_pnl", precision = 19, scale = 4)
    private BigDecimal dailyPnl;

    @Column(name = "daily_pnl_percentage", precision = 8, scale = 4)
    private BigDecimal dailyPnlPercentage;
}
