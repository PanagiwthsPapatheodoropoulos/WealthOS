package com.wealthos.backend.assets.service;

import com.wealthos.backend.assets.dto.CreateAssetRequest;
import com.wealthos.backend.assets.dto.UpdateAssetPriceRequest;
import com.wealthos.backend.assets.entity.Asset;
import com.wealthos.backend.assets.entity.AssetType;
import com.wealthos.backend.assets.mapper.AssetMapper;
import com.wealthos.backend.assets.repository.AssetPriceHistoryRepository;
import com.wealthos.backend.assets.repository.AssetRepository;
import com.wealthos.backend.common.exception.ConflictException;
import com.wealthos.backend.common.exception.ResourceNotFoundException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AssetServiceTest {

    @Mock
    private AssetRepository assetRepository;
    @Mock
    private AssetMapper assetMapper;
    @Mock
    private AssetPriceHistoryRepository assetPriceHistoryRepository;

    private AssetService assetService;

    @org.junit.jupiter.api.BeforeEach
    void setUp() {
        assetService = new AssetService(assetRepository, assetMapper, assetPriceHistoryRepository);
    }

    @Test
    void createRejectsDuplicateSymbol() {
        var request = new CreateAssetRequest("AAPL", "Apple Inc.", AssetType.STOCK, "USD", BigDecimal.TEN);
        when(assetRepository.existsBySymbolIgnoreCase("AAPL")).thenReturn(true);

        assertThatThrownBy(() -> assetService.create(request))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("AAPL");

        verify(assetRepository, never()).save(any());
    }

    @Test
    void createSavesAssetAndRecordsInitialPriceHistory() {
        var request = new CreateAssetRequest("MSFT", "Microsoft", AssetType.STOCK, "usd", new BigDecimal("400.00"));
        when(assetRepository.existsBySymbolIgnoreCase("MSFT")).thenReturn(false);
        when(assetRepository.save(any(Asset.class))).thenAnswer(inv -> inv.getArgument(0));

        assetService.create(request);

        ArgumentCaptor<Asset> assetCaptor = ArgumentCaptor.forClass(Asset.class);
        verify(assetRepository).save(assetCaptor.capture());
        Asset saved = assetCaptor.getValue();

        assertThat(saved.getSymbol()).isEqualTo("MSFT");
        assertThat(saved.getCurrency()).isEqualTo("USD"); // uppercased
        verify(assetPriceHistoryRepository).save(argThat(history ->
                history.getPrice().compareTo(new BigDecimal("400.00")) == 0));
    }

    @Test
    void updatePriceThrowsWhenAssetMissing() {
        UUID id = UUID.randomUUID();
        when(assetRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> assetService.updatePrice(id, new UpdateAssetPriceRequest(BigDecimal.ONE)))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void updatePriceRecordsNewHistoryEntry() {
        UUID id = UUID.randomUUID();
        Asset existing = Asset.builder().id(id).symbol("BTC").currentPrice(new BigDecimal("60000")).build();
        when(assetRepository.findById(id)).thenReturn(Optional.of(existing));
        when(assetRepository.save(any(Asset.class))).thenAnswer(inv -> inv.getArgument(0));

        assetService.updatePrice(id, new UpdateAssetPriceRequest(new BigDecimal("65000")));

        verify(assetPriceHistoryRepository).save(argThat(h ->
                h.getAssetId().equals(id) && h.getPrice().compareTo(new BigDecimal("65000")) == 0));
    }
}
