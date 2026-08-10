package com.wealthos.backend.accounts.mapper;

import com.wealthos.backend.accounts.dto.AccountResponse;
import com.wealthos.backend.accounts.entity.Account;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface AccountMapper {

    AccountResponse toResponse(Account account);
}
