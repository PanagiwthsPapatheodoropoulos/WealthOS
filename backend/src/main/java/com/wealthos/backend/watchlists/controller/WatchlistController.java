package com.wealthos.backend.watchlists.controller;

import lombok.RequiredArgsConstructor;
import com.wealthos.backend.common.dto.ApiResponse;
import com.wealthos.backend.common.security.AuthenticatedUser;
import com.wealthos.backend.common.security.CurrentUser;
import com.wealthos.backend.watchlists.dto.AddWatchlistItemRequest;
import com.wealthos.backend.watchlists.dto.CreateWatchlistRequest;
import com.wealthos.backend.watchlists.dto.WatchlistResponse;
import com.wealthos.backend.watchlists.service.WatchlistService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/watchlists")
@RequiredArgsConstructor
public class WatchlistController {

    private final WatchlistService watchlistService;

    

    @GetMapping
    public ApiResponse<List<WatchlistResponse>> getMyWatchlists(@CurrentUser AuthenticatedUser currentUser) {
        return ApiResponse.ok(watchlistService.getMyWatchlists(currentUser.id()));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<WatchlistResponse> create(@CurrentUser AuthenticatedUser currentUser,
                                                  @Valid @RequestBody CreateWatchlistRequest request) {
        return ApiResponse.ok(watchlistService.create(currentUser.id(), request), "Watchlist created");
    }

    @PostMapping("/{id}/items")
    public ApiResponse<WatchlistResponse> addItem(@CurrentUser AuthenticatedUser currentUser,
                                                   @PathVariable UUID id,
                                                   @Valid @RequestBody AddWatchlistItemRequest request) {
        return ApiResponse.ok(watchlistService.addItem(id, currentUser.id(), request), "Asset added");
    }

    @DeleteMapping("/{id}/items/{assetId}")
    public ApiResponse<WatchlistResponse> removeItem(@CurrentUser AuthenticatedUser currentUser,
                                                      @PathVariable UUID id,
                                                      @PathVariable UUID assetId) {
        return ApiResponse.ok(watchlistService.removeItem(id, currentUser.id(), assetId), "Asset removed");
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> deleteWatchlist(@CurrentUser AuthenticatedUser currentUser,
                                             @PathVariable UUID id) {
        watchlistService.delete(id, currentUser.id());
        return ApiResponse.ok(null, "Watchlist deleted successfully");
    }
}
