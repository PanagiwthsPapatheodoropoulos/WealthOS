package com.wealthos.backend.orders.mapper;

import com.wealthos.backend.orders.dto.OrderResponse;
import com.wealthos.backend.orders.entity.Order;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface OrderMapper {

    @Mapping(target = "portfolioId", source = "portfolio.id")
    @Mapping(target = "assetId", source = "asset.id")
    @Mapping(target = "symbol", source = "asset.symbol")
    OrderResponse toResponse(Order order);
}
