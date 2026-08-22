package com.wealthos.backend.market.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "price_anomalies")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PriceAnomaly {

    @Id @GeneratedValue @UuidGenerator
    private UUID id;

    @Column(name = "asset_id", nullable = false)
    private UUID assetId;

    @Column(nullable = false)
    private String symbol;

    @Column(nullable = false, precision = 18, scale = 6)
    private BigDecimal price;

    @Column(name = "z_score", nullable = false, precision = 10, scale = 4)
    private BigDecimal zScore;

    @Column(name = "detected_at", nullable = false, updatable = false)
    private Instant detectedAt;

    @PrePersist
    void onCreate() {
        this.detectedAt = Instant.now();
    }
}
