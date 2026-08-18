package com.wealthos.backend.orders.repository;

import com.wealthos.backend.orders.entity.OrderFill;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface OrderFillRepository extends JpaRepository<OrderFill, UUID> {
    List<OrderFill> findByOrderIdOrderByFilledAtAsc(UUID orderId);
}
