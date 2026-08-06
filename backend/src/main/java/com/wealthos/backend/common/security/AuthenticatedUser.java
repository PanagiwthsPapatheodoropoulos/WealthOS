package com.wealthos.backend.common.security;

import java.security.Principal;
import java.util.UUID;

public record AuthenticatedUser(UUID id, String email, String role) implements Principal {
    @Override
    public String getName() {
        return id != null ? id.toString() : "";
    }
}

