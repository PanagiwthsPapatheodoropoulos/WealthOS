package com.wealthos.backend.orders.controller;

import com.wealthos.backend.common.dto.ApiResponse;
import com.wealthos.backend.common.security.AuthenticatedUser;
import com.wealthos.backend.common.security.CurrentUser;
import com.wealthos.backend.orders.dto.CreateOrderRequest;
import com.wealthos.backend.orders.dto.OrderFillResponse;
import com.wealthos.backend.orders.dto.OrderResponse;
import com.wealthos.backend.orders.service.OrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping({"/api/v1/orders", "/api/orders"})
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    @GetMapping
    public ApiResponse<List<OrderResponse>> list(@CurrentUser AuthenticatedUser currentUser) {
        return ApiResponse.ok(orderService.listForUser(currentUser.id()));
    }

    @PostMapping
    public ApiResponse<OrderResponse> placeOrder(@CurrentUser AuthenticatedUser currentUser,
                                                 @Valid @RequestBody CreateOrderRequest request) {
        return ApiResponse.ok(orderService.placeOrder(currentUser.id(), request), "Order placed successfully");
    }

    @GetMapping("/{id}/fills")
    public ApiResponse<List<OrderFillResponse>> getFills(@CurrentUser AuthenticatedUser currentUser,
                                                          @PathVariable UUID id) {
        return ApiResponse.ok(orderService.getFillHistory(id, currentUser.id()));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> cancelOrder(@CurrentUser AuthenticatedUser currentUser,
                                         @PathVariable UUID id) {
        orderService.cancelOrder(id, currentUser.id());
        return ApiResponse.ok(null, "Order cancelled");
    }
}
