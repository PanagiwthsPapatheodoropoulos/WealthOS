package com.wealthos.backend.accounts.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.wealthos.backend.accounts.dto.AccountResponse;
import com.wealthos.backend.accounts.dto.CashMovementRequest;
import com.wealthos.backend.accounts.dto.CreateAccountRequest;
import com.wealthos.backend.accounts.service.AccountService;
import com.wealthos.backend.common.dto.ApiResponse;
import com.wealthos.backend.common.exception.TooManyRequestsException;
import com.wealthos.backend.common.idempotency.IdempotencyService;
import com.wealthos.backend.common.security.AuthenticatedUser;
import com.wealthos.backend.common.security.CurrentUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/accounts")
@RequiredArgsConstructor
public class AccountController {

    private final AccountService accountService;
    private final IdempotencyService idempotencyService;
    private final ObjectMapper objectMapper;

    @GetMapping
    public ApiResponse<List<AccountResponse>> getMyAccounts(@CurrentUser AuthenticatedUser currentUser) {
        return ApiResponse.ok(accountService.getMyAccounts(currentUser.id()));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<AccountResponse> create(@CurrentUser AuthenticatedUser currentUser,
                                                @Valid @RequestBody CreateAccountRequest request) {
        return ApiResponse.ok(accountService.create(currentUser.id(), request), "Account created");
    }

    @PostMapping("/{id}/deposit")
    public ApiResponse<AccountResponse> deposit(@CurrentUser AuthenticatedUser currentUser,
                                                 @PathVariable UUID id,
                                                 @RequestHeader(value = "Idempotency-Key", required = false) String idemKey,
                                                 @Valid @RequestBody CashMovementRequest request) {
        return withIdempotency(currentUser.id(), idemKey, () -> ApiResponse.ok(
                accountService.deposit(id, currentUser.id(), request.amount()),
                "Deposit completed"
        ));
    }

    @PostMapping("/{id}/withdraw")
    public ApiResponse<AccountResponse> withdraw(@CurrentUser AuthenticatedUser currentUser,
                                                  @PathVariable UUID id,
                                                  @RequestHeader(value = "Idempotency-Key", required = false) String idemKey,
                                                  @Valid @RequestBody CashMovementRequest request) {
        return withIdempotency(currentUser.id(), idemKey, () -> ApiResponse.ok(
                accountService.withdraw(id, currentUser.id(), request.amount()),
                "Withdrawal completed"
        ));
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
            idempotencyService.release(userKey, idemKey);
            throw ex;
        }
    }
}
