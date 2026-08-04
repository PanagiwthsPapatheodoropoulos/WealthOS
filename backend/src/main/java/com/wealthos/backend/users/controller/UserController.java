package com.wealthos.backend.users.controller;

import lombok.RequiredArgsConstructor;
import com.wealthos.backend.common.dto.ApiResponse;
import com.wealthos.backend.common.security.AuthenticatedUser;
import com.wealthos.backend.common.security.CurrentUser;
import com.wealthos.backend.users.dto.UpdateUserRequest;
import com.wealthos.backend.users.dto.UserResponse;
import com.wealthos.backend.users.service.UserService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    public ApiResponse<UserResponse> getCurrentUser(@CurrentUser AuthenticatedUser currentUser) {
        return ApiResponse.ok(userService.getUserById(currentUser.id()));
    }

    @PutMapping("/me")
    public ApiResponse<UserResponse> updateCurrentUser(
            @CurrentUser AuthenticatedUser currentUser,
            @Valid @RequestBody UpdateUserRequest request) {
        return ApiResponse.ok(userService.updateUser(currentUser.id(), request));
    }

    @GetMapping("/me/preferences")
    public ApiResponse<Map<String, Object>> getUserPreferences(@CurrentUser AuthenticatedUser currentUser) {
        return ApiResponse.ok(userService.getUserPreferences(currentUser.id()));
    }

    @PutMapping("/me/preferences")
    public ApiResponse<Map<String, Object>> updateUserPreferences(
            @CurrentUser AuthenticatedUser currentUser,
            @RequestBody Map<String, Object> payload) {
        return ApiResponse.ok(userService.updateUserPreferences(currentUser.id(), payload));
    }

    @PostMapping("/{id}/promote-to-admin")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<UserResponse> promoteToAdmin(@PathVariable UUID id) {
        return ApiResponse.ok(userService.promoteToAdmin(id), "User promoted to ADMIN");
    }
}
