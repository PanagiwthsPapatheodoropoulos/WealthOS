package com.wealthos.backend.orders.repository;

import com.wealthos.backend.orders.entity.Order;
import com.wealthos.backend.orders.entity.OrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OrderRepository extends JpaRepository<Order, UUID> {

    @Query("SELECT o FROM Order o JOIN FETCH o.asset JOIN FETCH o.portfolio WHERE o.user.id = :userId ORDER BY o.createdAt DESC")
    List<Order> findByUserIdOrderByCreatedAtDesc(@Param("userId") UUID userId);

    @Query("SELECT o FROM Order o JOIN FETCH o.asset JOIN FETCH o.portfolio WHERE o.portfolio.id = :portfolioId ORDER BY o.createdAt DESC")
    List<Order> findByPortfolioIdOrderByCreatedAtDesc(@Param("portfolioId") UUID portfolioId);

    @Query("SELECT o FROM Order o JOIN FETCH o.asset JOIN FETCH o.portfolio WHERE o.id = :id AND o.user.id = :userId")
    Optional<Order> findByIdAndUserId(@Param("id") UUID id, @Param("userId") UUID userId);

    @Query("SELECT o FROM Order o JOIN FETCH o.asset JOIN FETCH o.portfolio JOIN FETCH o.user WHERE o.status = :status")
    List<Order> findAllByStatusWithDetails(@Param("status") OrderStatus status);
}
