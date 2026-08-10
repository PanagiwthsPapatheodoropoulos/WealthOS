package com.wealthos.backend.accounts.dto;

import com.wealthos.backend.accounts.entity.AccountType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateAccountRequest(
        @NotBlank(message = "Name is required")
        String name,

        @NotNull(message = "Account type is required")
        AccountType accountType,

        @NotBlank(message = "Currency is required")
        String currency
) {
}
