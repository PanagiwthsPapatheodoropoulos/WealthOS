package com.wealthos.backend.orders.service;

import com.wealthos.backend.assets.entity.Asset;
import com.wealthos.backend.assets.service.AssetService;
import com.wealthos.backend.common.exception.BusinessRuleException;
import com.wealthos.backend.common.exception.ResourceNotFoundException;
import com.wealthos.backend.orders.dto.CreateOrderRequest;
import com.wealthos.backend.orders.dto.OrderFillResponse;
import com.wealthos.backend.orders.dto.OrderResponse;
import com.wealthos.backend.orders.entity.Order;
import com.wealthos.backend.orders.entity.OrderFill;
import com.wealthos.backend.orders.entity.OrderStatus;
import com.wealthos.backend.orders.entity.OrderType;
import com.wealthos.backend.orders.mapper.OrderMapper;
import com.wealthos.backend.orders.repository.OrderFillRepository;
import com.wealthos.backend.orders.repository.OrderRepository;
import com.wealthos.backend.portfolios.entity.Portfolio;
import com.wealthos.backend.portfolios.service.PortfolioService;
import com.wealthos.backend.transactions.dto.BuyRequest;
import com.wealthos.backend.transactions.dto.SellRequest;
import com.wealthos.backend.transactions.entity.TransactionType;
import com.wealthos.backend.transactions.service.TransactionService;
import com.wealthos.backend.users.entity.User;
import com.wealthos.backend.users.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderService {

    private final OrderRepository orderRepository;
    private final OrderFillRepository orderFillRepository;
    private final SlippageEngine slippageEngine;
    private final UserService userService;
    private final PortfolioService portfolioService;
    private final AssetService assetService;
    private final TransactionService transactionService;
    private final OrderMapper orderMapper;

    @Transactional(readOnly = true)
    public List<OrderResponse> listForUser(UUID userId) {
        return orderRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public OrderResponse placeOrder(UUID userId, CreateOrderRequest request) {
        User user = userService.getEntityById(userId);
        Portfolio portfolio = portfolioService.getEntityByIdAndUser(request.portfolioId(), userId);
        Asset asset = assetService.getEntityById(request.assetId());

        Order order = Order.builder()
                .user(user)
                .portfolio(portfolio)
                .asset(asset)
                .type(request.type())
                .action(request.action())
                .quantity(request.quantity())
                .targetPrice(request.targetPrice())
                .status(OrderStatus.PENDING)
                .build();

        return toResponse(orderRepository.save(order));
    }

    @Transactional
    public void cancelOrder(UUID orderId, UUID userId) {
        Order order = orderRepository.findByIdAndUserId(orderId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", orderId));

        if (order.getStatus() != OrderStatus.PENDING) {
            throw new BusinessRuleException("Cannot cancel order with status " + order.getStatus());
        }

        order.setStatus(OrderStatus.CANCELLED);
        order.setCancelledAt(Instant.now());
        orderRepository.save(order);
    }

    @Transactional
    public int matchPendingOrders() {
        List<Order> pendingOrders = orderRepository.findAllByStatusWithDetails(OrderStatus.PENDING);
        if (pendingOrders.isEmpty()) {
            return 0;
        }
        int filledCount = 0;

        for (Order order : pendingOrders) {
            BigDecimal currentPrice = order.getAsset().getCurrentPrice();
            boolean shouldExecute = shouldFillOrder(order, currentPrice);

            if (shouldExecute) {
                try {
                    executeOrder(order);
                    order.setStatus(OrderStatus.FILLED);
                    order.setFilledAt(Instant.now());
                    orderRepository.save(order);
                    filledCount++;
                } catch (Exception e) {
                    log.error("Failed to execute order {}: {}", order.getId(), e.getMessage());
                }
            }
        }
        return filledCount;
    }

    private boolean shouldFillOrder(Order order, BigDecimal currentPrice) {
        if (order.getType() == OrderType.MARKET) {
            return true;
        }
        if (order.getType() == OrderType.LIMIT) {
            return order.getAction() == TransactionType.BUY
                    ? currentPrice.compareTo(order.getTargetPrice()) <= 0
                    : currentPrice.compareTo(order.getTargetPrice()) >= 0;
        }
        if (order.getType() == OrderType.STOP_LOSS) {
            if (order.getAction() == TransactionType.SELL) {
                return currentPrice.compareTo(order.getTargetPrice()) <= 0;
            }
            if (order.getAction() == TransactionType.BUY) {
                return currentPrice.compareTo(order.getTargetPrice()) >= 0;
            }
        }
        return false;
    }

    private void executeOrder(Order order) {
        BigDecimal marketPrice = order.getAsset().getCurrentPrice();
        BigDecimal execPrice;
        BigDecimal slippageBps;

        if (order.getType() == OrderType.MARKET) {
            execPrice = slippageEngine.applySlippage(marketPrice, order.getQuantity(), order.getAction());
            slippageBps = slippageEngine.lastComputedBps(marketPrice, order.getQuantity());
        } else {
            execPrice = order.getTargetPrice(); // limit/stop orders fill at their trigger price, no slippage
            slippageBps = BigDecimal.ZERO;
        }

        // Temporarily override the asset's price for this fill so buy()/sell() records the executed price
        BigDecimal originalPrice = order.getAsset().getCurrentPrice();
        order.getAsset().setCurrentPrice(execPrice);
        try {
            if (order.getAction() == TransactionType.BUY) {
                transactionService.buy(order.getUser().getId(), new BuyRequest(
                        order.getPortfolio().getId(), order.getAsset().getId(), order.getQuantity()));
            } else {
                transactionService.sell(order.getUser().getId(), new SellRequest(
                        order.getPortfolio().getId(), order.getAsset().getId(), order.getQuantity()));
            }
        } finally {
            order.getAsset().setCurrentPrice(originalPrice); // restore live market price
        }

        orderFillRepository.save(OrderFill.builder()
                .order(order)
                .fillQuantity(order.getQuantity())
                .fillPrice(execPrice)
                .slippageBps(slippageBps)
                .build());
    }

    @Transactional(readOnly = true)
    public List<OrderFillResponse> getFillHistory(UUID orderId, UUID userId) {
        orderRepository.findByIdAndUserId(orderId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", orderId));
        return orderFillRepository.findByOrderIdOrderByFilledAtAsc(orderId).stream()
                .map(f -> new OrderFillResponse(f.getFillQuantity(), f.getFillPrice(), f.getSlippageBps(), f.getFilledAt()))
                .toList();
    }

    private OrderResponse toResponse(Order order) {
        return orderMapper.toResponse(order);
    }
}
