package com.wealthos.backend.watchlists.service;

import com.wealthos.backend.assets.entity.Asset;
import com.wealthos.backend.assets.entity.AssetType;
import com.wealthos.backend.assets.service.AssetService;
import com.wealthos.backend.common.exception.ConflictException;
import com.wealthos.backend.common.exception.ResourceNotFoundException;
import com.wealthos.backend.users.repository.UserRepository;
import com.wealthos.backend.watchlists.dto.AddWatchlistItemRequest;
import com.wealthos.backend.watchlists.dto.WatchlistResponse;
import com.wealthos.backend.watchlists.entity.Watchlist;
import com.wealthos.backend.watchlists.entity.WatchlistItem;
import com.wealthos.backend.watchlists.repository.WatchlistItemRepository;
import com.wealthos.backend.watchlists.repository.WatchlistRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WatchlistServiceTest {

    @Mock private WatchlistRepository watchlistRepository;
    @Mock private WatchlistItemRepository watchlistItemRepository;
    @Mock private AssetService assetService;
    @Mock private UserRepository userRepository;
    @Mock private com.wealthos.backend.watchlists.mapper.WatchlistMapper watchlistMapper;

    private WatchlistService watchlistService;

    @BeforeEach
    void setUp() {
        watchlistService = new WatchlistService(watchlistRepository, watchlistItemRepository, assetService, userRepository, watchlistMapper);
    }

    @Test
    void addItemRejectsDuplicateAsset() {
        UUID watchlistId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        UUID assetId = UUID.randomUUID();

        Watchlist watchlist = Watchlist.builder().id(watchlistId).name("Tech").build();
        Asset asset = Asset.builder().id(assetId).symbol("MSFT").assetType(AssetType.STOCK)
                .currentPrice(BigDecimal.TEN).build();

        when(watchlistRepository.findByIdAndUserId(watchlistId, userId)).thenReturn(Optional.of(watchlist));
        when(assetService.getEntityById(assetId)).thenReturn(asset);
        when(watchlistItemRepository.existsByWatchlistIdAndAssetId(watchlistId, assetId)).thenReturn(true);

        assertThatThrownBy(() -> watchlistService.addItem(watchlistId, userId, new AddWatchlistItemRequest(assetId)))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("MSFT");

        verify(watchlistItemRepository, never()).save(any());
    }

    @Test
    void addItemSucceedsForNewAsset() {
        UUID watchlistId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        UUID assetId = UUID.randomUUID();

        Watchlist watchlist = Watchlist.builder().id(watchlistId).name("Tech").build();
        Asset asset = Asset.builder().id(assetId).symbol("NVDA").assetType(AssetType.STOCK)
                .currentPrice(new BigDecimal("120.00")).build();

        when(watchlistRepository.findByIdAndUserId(watchlistId, userId)).thenReturn(Optional.of(watchlist));
        when(assetService.getEntityById(assetId)).thenReturn(asset);
        when(watchlistItemRepository.existsByWatchlistIdAndAssetId(watchlistId, assetId)).thenReturn(false);
        when(watchlistItemRepository.findByWatchlistId(watchlistId)).thenReturn(
                List.of(WatchlistItem.builder().watchlist(watchlist).asset(asset).build()));
        WatchlistResponse mockResponse = new WatchlistResponse(
                watchlistId,
                "Tech",
                List.of(new com.wealthos.backend.watchlists.dto.WatchlistItemResponse(assetId, "NVDA", "NVIDIA", new BigDecimal("120.00"))),
                java.time.Instant.now()
        );
        when(watchlistMapper.toResponse(eq(watchlist), any())).thenReturn(mockResponse);

        WatchlistResponse response = watchlistService.addItem(watchlistId, userId, new AddWatchlistItemRequest(assetId));

        verify(watchlistItemRepository).save(any(WatchlistItem.class));
        assertThat(response.items()).hasSize(1);
        assertThat(response.items().get(0).symbol()).isEqualTo("NVDA");
    }

    @Test
    void addItemThrowsBusinessRuleExceptionWhenAssetIdAndSymbolMissing() {
        UUID watchlistId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        Watchlist watchlist = Watchlist.builder().id(watchlistId).name("Tech").build();

        when(watchlistRepository.findByIdAndUserId(watchlistId, userId)).thenReturn(Optional.of(watchlist));

        assertThatThrownBy(() -> watchlistService.addItem(watchlistId, userId, new AddWatchlistItemRequest(null, null, null, null, null, null)))
                .isInstanceOf(com.wealthos.backend.common.exception.BusinessRuleException.class)
                .hasMessageContaining("Asset ID or Symbol is required");
    }

    @Test
    void removeItemThrowsWhenItemNotInWatchlist() {
        UUID watchlistId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        UUID assetId = UUID.randomUUID();

        Watchlist watchlist = Watchlist.builder().id(watchlistId).name("Tech").build();
        when(watchlistRepository.findByIdAndUserId(watchlistId, userId)).thenReturn(Optional.of(watchlist));
        when(watchlistItemRepository.findByWatchlistIdAndAssetId(watchlistId, assetId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> watchlistService.removeItem(watchlistId, userId, assetId))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
