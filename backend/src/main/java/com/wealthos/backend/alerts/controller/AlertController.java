package com.wealthos.backend.alerts.controller;

import com.wealthos.backend.alerts.dto.AlertResponse;
import com.wealthos.backend.alerts.dto.CreateAlertRequest;
import com.wealthos.backend.alerts.service.AlertService;
import com.wealthos.backend.common.dto.ApiResponse;
import com.wealthos.backend.common.security.AuthenticatedUser;
import com.wealthos.backend.common.security.CurrentUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping({"/api/v1/alerts", "/api/alerts"})
@RequiredArgsConstructor
public class AlertController {

    private final AlertService alertService;

    @GetMapping
    public ApiResponse<List<AlertResponse>> list(@CurrentUser AuthenticatedUser currentUser) {
        return ApiResponse.ok(alertService.list(currentUser.id()));
    }

    @PostMapping
    public ApiResponse<AlertResponse> create(@CurrentUser AuthenticatedUser currentUser,
                                             @Valid @RequestBody CreateAlertRequest request) {
        return ApiResponse.ok(alertService.create(currentUser.id(), request), "Alert created");
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@CurrentUser AuthenticatedUser currentUser,
                                    @PathVariable UUID id) {
        alertService.delete(id, currentUser.id());
        return ApiResponse.ok(null, "Alert deleted");
    }

    @PostMapping("/{id}/cancel")
    public ApiResponse<Void> cancel(@CurrentUser AuthenticatedUser currentUser,
                                    @PathVariable UUID id) {
        alertService.cancel(id, currentUser.id());
        return ApiResponse.ok(null, "Alert cancelled");
    }
}
