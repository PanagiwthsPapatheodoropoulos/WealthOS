package com.wealthos.backend.alerts.mapper;

import com.wealthos.backend.alerts.dto.AlertResponse;
import com.wealthos.backend.alerts.entity.Alert;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface AlertMapper {

    @Mapping(target = "assetId", source = "asset.id")
    @Mapping(target = "symbol", source = "asset.symbol")
    AlertResponse toResponse(Alert alert);
}
