package com.wealthos.backend.watchlists.mapper;

import com.wealthos.backend.watchlists.dto.WatchlistItemResponse;
import com.wealthos.backend.watchlists.dto.WatchlistResponse;
import com.wealthos.backend.watchlists.entity.Watchlist;
import com.wealthos.backend.watchlists.entity.WatchlistItem;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface WatchlistMapper {

    @Mapping(target = "assetId", source = "asset.id")
    @Mapping(target = "symbol", source = "asset.symbol")
    @Mapping(target = "name", source = "asset.name")
    @Mapping(target = "currentPrice", source = "asset.currentPrice")
    WatchlistItemResponse toItemResponse(WatchlistItem item);

    List<WatchlistItemResponse> toItemResponseList(List<WatchlistItem> items);

    @Mapping(target = "id", source = "watchlist.id")
    @Mapping(target = "name", source = "watchlist.name")
    @Mapping(target = "createdAt", source = "watchlist.createdAt")
    @Mapping(target = "items", source = "items")
    WatchlistResponse toResponse(Watchlist watchlist, List<WatchlistItemResponse> items);
}
