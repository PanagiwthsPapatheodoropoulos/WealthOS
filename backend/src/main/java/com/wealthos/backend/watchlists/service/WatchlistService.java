package com.wealthos.backend.watchlists.service;

import lombok.RequiredArgsConstructor;
import com.wealthos.backend.assets.entity.Asset;
import com.wealthos.backend.assets.service.AssetService;
import com.wealthos.backend.common.exception.BusinessRuleException;
import com.wealthos.backend.common.exception.ConflictException;
import com.wealthos.backend.common.exception.ResourceNotFoundException;
import com.wealthos.backend.users.repository.UserRepository;
import com.wealthos.backend.watchlists.dto.AddWatchlistItemRequest;
import com.wealthos.backend.watchlists.dto.CreateWatchlistRequest;
import com.wealthos.backend.watchlists.dto.WatchlistResponse;
import com.wealthos.backend.watchlists.entity.Watchlist;
import com.wealthos.backend.watchlists.entity.WatchlistItem;
import com.wealthos.backend.watchlists.mapper.WatchlistMapper;
import com.wealthos.backend.watchlists.repository.WatchlistItemRepository;
import com.wealthos.backend.watchlists.repository.WatchlistRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class WatchlistService {

    private final WatchlistRepository watchlistRepository;
    private final WatchlistItemRepository watchlistItemRepository;
    private final AssetService assetService;
    private final UserRepository userRepository;
    private final WatchlistMapper watchlistMapper;

    @Transactional(readOnly = true)
    public Watchlist getEntityByIdAndUser(UUID id, UUID userId) {
        return watchlistRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Watchlist", id));
    }

    @Transactional(readOnly = true)
    public List<WatchlistResponse> getMyWatchlists(UUID userId) {
        List<Watchlist> watchlists = watchlistRepository.findByUserId(userId);
        if (watchlists.isEmpty()) {
            return List.of();
        }

        List<UUID> watchlistIds = watchlists.stream().map(Watchlist::getId).toList();
        List<WatchlistItem> allItems = watchlistItemRepository.findByWatchlistIdIn(watchlistIds);
        Map<UUID, List<WatchlistItem>> itemsByWatchlist = allItems.stream()
                .collect(Collectors.groupingBy(wi -> wi.getWatchlist().getId()));

        return watchlists.stream()
                .map(w -> watchlistMapper.toResponse(
                        w,
                        watchlistMapper.toItemResponseList(itemsByWatchlist.getOrDefault(w.getId(), List.of()))
                ))
                .toList();
    }

    @Transactional
    public WatchlistResponse create(UUID userId, CreateWatchlistRequest request) {
        var userRef = userRepository.getReferenceById(userId);

        Watchlist watchlist = Watchlist.builder()
                .user(userRef)
                .name(request.name())
                .build();

        watchlist = watchlistRepository.save(watchlist);
        return toResponse(watchlist);
    }

    @Transactional
    public WatchlistResponse addItem(UUID watchlistId, UUID userId, AddWatchlistItemRequest request) {
        Watchlist watchlist = getEntityByIdAndUser(watchlistId, userId);
        Asset asset;
        if (request.assetId() != null) {
            asset = assetService.getEntityById(request.assetId());
        } else if (request.symbol() != null && !request.symbol().isBlank()) {
            asset = assetService.getOrCreateBySymbol(
                    request.symbol(),
                    request.name(),
                    request.assetType(),
                    request.currency(),
                    request.currentPrice()
            );
        } else {
            throw new BusinessRuleException("Asset ID or Symbol is required");
        }

        if (watchlistItemRepository.existsByWatchlistIdAndAssetId(watchlistId, asset.getId())) {
            throw new ConflictException("'%s' is already in this watchlist".formatted(asset.getSymbol()));
        }

        WatchlistItem item = WatchlistItem.builder()
                .watchlist(watchlist)
                .asset(asset)
                .build();

        watchlistItemRepository.save(item);
        return toResponse(watchlist);
    }

    @Transactional
    public WatchlistResponse removeItem(UUID watchlistId, UUID userId, UUID assetId) {
        Watchlist watchlist = getEntityByIdAndUser(watchlistId, userId);

        WatchlistItem item = watchlistItemRepository.findByWatchlistIdAndAssetId(watchlistId, assetId)
                .orElseThrow(() -> new ResourceNotFoundException("Watchlist item", assetId));

        watchlistItemRepository.delete(item);
        return toResponse(watchlist);
    }

    @Transactional
    public void delete(UUID watchlistId, UUID userId) {
        Watchlist watchlist = getEntityByIdAndUser(watchlistId, userId);
        watchlistItemRepository.deleteByWatchlistId(watchlist.getId());
        watchlistRepository.delete(watchlist);
    }

    private WatchlistResponse toResponse(Watchlist watchlist) {
        List<WatchlistItem> items = watchlistItemRepository.findByWatchlistId(watchlist.getId());
        return watchlistMapper.toResponse(watchlist, watchlistMapper.toItemResponseList(items));
    }
}
