package com.wealthos.backend.transactions.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.wealthos.backend.common.dto.ApiResponse;
import com.wealthos.backend.common.exception.TooManyRequestsException;
import com.wealthos.backend.common.idempotency.IdempotencyService;
import com.wealthos.backend.common.security.AuthenticatedUser;
import com.wealthos.backend.common.security.CurrentUser;
import com.wealthos.backend.transactions.dto.BuyRequest;
import com.wealthos.backend.transactions.dto.SellRequest;
import com.wealthos.backend.transactions.dto.TransactionEventResponse;
import com.wealthos.backend.transactions.dto.TransactionResponse;
import com.wealthos.backend.transactions.service.TransactionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping({"/api/v1/transactions", "/api/transactions"})
@RequiredArgsConstructor
public class TransactionController {

    private final TransactionService transactionService;
    private final IdempotencyService idempotencyService;
    private final ObjectMapper objectMapper;

    @PostMapping("/buy")
    public ApiResponse<TransactionResponse> buy(@CurrentUser AuthenticatedUser currentUser,
                                                 @RequestHeader(value = "Idempotency-Key", required = false) String idemKey,
                                                 @Valid @RequestBody BuyRequest request) {
        return withIdempotency(currentUser.id(), idemKey,
                () -> ApiResponse.ok(transactionService.buy(currentUser.id(), request), "Purchase completed"));
    }

    @PostMapping("/sell")
    public ApiResponse<TransactionResponse> sell(@CurrentUser AuthenticatedUser currentUser,
                                                  @RequestHeader(value = "Idempotency-Key", required = false) String idemKey,
                                                  @Valid @RequestBody SellRequest request) {
        return withIdempotency(currentUser.id(), idemKey,
                () -> ApiResponse.ok(transactionService.sell(currentUser.id(), request), "Sale completed"));
    }

    @GetMapping
    public ApiResponse<List<TransactionResponse>> list(@CurrentUser AuthenticatedUser currentUser,
                                                        @RequestParam UUID portfolioId) {
        return ApiResponse.ok(transactionService.listForPortfolio(currentUser.id(), portfolioId));
    }

    @GetMapping("/{id}/events")
    public ApiResponse<List<TransactionEventResponse>> getEventLog(@CurrentUser AuthenticatedUser currentUser,
                                                                   @PathVariable UUID id) {
        return ApiResponse.ok(transactionService.getEventLog(id, currentUser.id()));
    }

    @SneakyThrows
    private <T> ApiResponse<T> withIdempotency(UUID userId, String idemKey, java.util.function.Supplier<ApiResponse<T>> action) {
        String userKey = userId.toString();
        String cached = idempotencyService.checkAndReserve(userKey, idemKey);
        if ("PENDING".equals(cached)) {
            throw new TooManyRequestsException("This request is already being processed.");
        }
        if (cached != null) {
            return objectMapper.readValue(cached, objectMapper.getTypeFactory()
                    .constructParametricType(ApiResponse.class, Object.class));
        }
        try {
            ApiResponse<T> result = action.get();
            idempotencyService.store(userKey, idemKey, objectMapper.writeValueAsString(result));
            return result;
        } catch (RuntimeException ex) {
            idempotencyService.release(userKey, idemKey); // allow retry on genuine failure
            throw ex;
        }
    }
}
