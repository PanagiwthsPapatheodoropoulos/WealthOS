package com.wealthos.backend.market.service;

import com.wealthos.backend.market.dto.PriceAnomalyResponse;
import com.wealthos.backend.market.repository.PriceAnomalyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PriceAnomalyService {

    private final PriceAnomalyRepository priceAnomalyRepository;

    @Transactional(readOnly = true)
    public List<PriceAnomalyResponse> getRecentAnomalies(UUID assetId) {
        return priceAnomalyRepository.findTop20ByAssetIdOrderByDetectedAtDesc(assetId).stream()
                .map(a -> new PriceAnomalyResponse(a.getId(), a.getAssetId(), a.getSymbol(), a.getPrice(), a.getZScore(), a.getDetectedAt()))
                .toList();
    }
}
