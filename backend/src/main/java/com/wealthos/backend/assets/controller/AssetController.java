package com.wealthos.backend.assets.controller;

import lombok.RequiredArgsConstructor;
import com.wealthos.backend.assets.dto.AssetResponse;
import com.wealthos.backend.assets.dto.CreateAssetRequest;
import com.wealthos.backend.assets.dto.UpdateAssetPriceRequest;
import com.wealthos.backend.assets.service.AssetService;
import com.wealthos.backend.common.dto.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/assets")
@RequiredArgsConstructor
public class AssetController {

    private final AssetService assetService;

    

    @GetMapping
    public ApiResponse<List<AssetResponse>> getAll() {
        return ApiResponse.ok(assetService.getAll());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<AssetResponse> create(@Valid @RequestBody CreateAssetRequest request) {
        return ApiResponse.ok(assetService.create(request), "Asset created");
    }

    @PatchMapping("/{id}/price")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<AssetResponse> updatePrice(@PathVariable UUID id,
                                                   @Valid @RequestBody UpdateAssetPriceRequest request) {
        return ApiResponse.ok(assetService.updatePrice(id, request), "Price updated");
    }
}
