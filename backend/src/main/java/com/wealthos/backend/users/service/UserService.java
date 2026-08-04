package com.wealthos.backend.users.service;

import com.wealthos.backend.users.enums.Role;
import lombok.RequiredArgsConstructor;
import com.wealthos.backend.common.exception.ResourceNotFoundException;
import com.wealthos.backend.users.dto.UpdateUserRequest;
import com.wealthos.backend.users.dto.UserResponse;
import com.wealthos.backend.users.entity.User;
import com.wealthos.backend.users.mapper.UserMapper;
import com.wealthos.backend.users.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final UserMapper userMapper;

    @Transactional(readOnly = true)
    public UserResponse getUserById(UUID id) {
        return userMapper.toResponse(getEntityById(id));
    }

    @Transactional(readOnly = true)
    public User getEntityById(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getUserPreferences(UUID userId) {
        getEntityById(userId);
        return Map.of(
                "baseCurrency", "EUR",
                "theme", "light",
                "defaultTimeframe", "1M"
        );
    }

    @Transactional
    public Map<String, Object> updateUserPreferences(UUID userId, Map<String, Object> payload) {
        getEntityById(userId);
        return Map.of(
                "baseCurrency", payload.getOrDefault("baseCurrency", "EUR"),
                "theme", payload.getOrDefault("theme", "light"),
                "defaultTimeframe", payload.getOrDefault("defaultTimeframe", "1M")
        );
    }

    @Transactional
    public UserResponse updateUser(UUID id, UpdateUserRequest request) {
        User user = getEntityById(id);
        if (request.firstName() != null) {
            user.setFirstName(request.firstName());
        }
        if (request.lastName() != null) {
            user.setLastName(request.lastName());
        }
        return userMapper.toResponse(userRepository.save(user));
    }

    @Transactional
    public UserResponse promoteToAdmin(UUID targetUserId) {
        User user = getEntityById(targetUserId);
        user.setRole(Role.ADMIN);
        return userMapper.toResponse(userRepository.save(user));
    }
}
