package com.wealthos.backend.common.exception;

import org.springframework.http.HttpStatus;

public final class ResourceNotFoundException extends ApiException {

    public ResourceNotFoundException(String resource, Object identifier) {
        super(HttpStatus.NOT_FOUND, "%s not found: %s".formatted(resource, identifier));
    }

    public ResourceNotFoundException(String message) {
        super(HttpStatus.NOT_FOUND, message);
    }
}
