package com.wealthos.backend.orders.entity;

import com.wealthos.backend.assets.entity.Asset;
import com.wealthos.backend.portfolios.entity.Portfolio;
import com.wealthos.backend.transactions.entity.TransactionType;
import com.wealthos.backend.users.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "orders")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Order {

    @Id
    @GeneratedValue
    @UuidGenerator
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "portfolio_id", nullable = false)
    private Portfolio portfolio;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "asset_id", nullable = false)
    private Asset asset;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private OrderType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private TransactionType action;

    @Column(nullable = false, precision = 18, scale = 6)
    private BigDecimal quantity;

    @Column(name = "target_price", nullable = false, precision = 18, scale = 6)
    private BigDecimal targetPrice;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private OrderStatus status = OrderStatus.PENDING;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "filled_at")
    private Instant filledAt;

    @Column(name = "cancelled_at")
    private Instant cancelledAt;

    @PrePersist
    void onCreate() {
        this.createdAt = Instant.now();
    }
}
