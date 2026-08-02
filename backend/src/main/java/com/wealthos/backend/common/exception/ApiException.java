package com.wealthos.backend.common.exception;

import org.springframework.http.HttpStatus;

public abstract sealed class ApiException extends RuntimeException
        permits BusinessRuleException, ConflictException, ResourceNotFoundException, TooManyRequestsException, UnauthorizedException {

    private final HttpStatus status;

    public ApiException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
