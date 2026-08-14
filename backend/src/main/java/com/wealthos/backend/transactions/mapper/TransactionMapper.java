package com.wealthos.backend.transactions.mapper;

import com.wealthos.backend.transactions.dto.TransactionResponse;
import com.wealthos.backend.transactions.entity.Transaction;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface TransactionMapper {

    @Mapping(target = "portfolioId", source = "portfolio.id")
    @Mapping(target = "assetId", source = "asset.id")
    @Mapping(target = "symbol", source = "asset.symbol")
    TransactionResponse toResponse(Transaction transaction);
}
