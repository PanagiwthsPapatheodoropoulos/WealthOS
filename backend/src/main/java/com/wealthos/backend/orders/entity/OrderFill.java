package com.wealthos.backend.orders.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "order_fills")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class OrderFill {

    @Id @GeneratedValue @UuidGenerator
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @Column(name = "fill_quantity", nullable = false, precision = 18, scale = 6)
    private BigDecimal fillQuantity;

    @Column(name = "fill_price", nullable = false, precision = 18, scale = 6)
    private BigDecimal fillPrice;

    @Column(name = "slippage_bps", nullable = false, precision = 8, scale = 2)
    @Builder.Default
    private BigDecimal slippageBps = BigDecimal.ZERO;

    @Column(name = "filled_at", nullable = false, updatable = false)
    private Instant filledAt;

    @PrePersist
    void onCreate() { this.filledAt = Instant.now(); }
}
