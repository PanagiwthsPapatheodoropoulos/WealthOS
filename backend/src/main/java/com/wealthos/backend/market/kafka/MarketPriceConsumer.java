package com.wealthos.backend.market.kafka;

import com.wealthos.backend.alerts.service.AlertService;
import com.wealthos.backend.assets.dto.AssetResponse;
import com.wealthos.backend.assets.dto.UpdateAssetPriceRequest;
import com.wealthos.backend.assets.entity.Asset;
import com.wealthos.backend.assets.repository.AssetRepository;
import com.wealthos.backend.assets.service.AssetService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class MarketPriceConsumer {

    private final AssetRepository assetRepository;
    private final AssetService assetService;
    private final SimpMessagingTemplate messagingTemplate;
    private final AlertService alertService;

    @KafkaListener(topics = "market-ticks", groupId = "wealthos-price-updater")
    public void onTick(Map<String, Object> event) {
        String symbol = (String) event.get("symbol");
        BigDecimal price = new BigDecimal(event.get("price").toString());

        assetRepository.findBySymbolIgnoreCase(symbol).ifPresentOrElse(
                (Asset asset) -> {
                    AssetResponse updated = assetService.updatePrice(asset.getId(), new UpdateAssetPriceRequest(price));
                    messagingTemplate.convertAndSend("/topic/market-prices", updated);
                    alertService.checkAndTriggerForAsset(asset.getId(), price);
                },
                () -> log.warn("Received market tick for unknown symbol '{}', ignoring", symbol)
        );
    }
}
