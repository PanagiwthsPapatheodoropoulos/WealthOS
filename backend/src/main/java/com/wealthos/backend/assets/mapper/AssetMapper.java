package com.wealthos.backend.assets.mapper;

import com.wealthos.backend.assets.dto.AssetResponse;
import com.wealthos.backend.assets.entity.Asset;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface AssetMapper {

    AssetResponse toResponse(Asset asset);
}
