package com.wealthos.backend.common.exception;

import org.springframework.http.HttpStatus;

public final class UnauthorizedException extends ApiException {

    public UnauthorizedException(String message) {
        super(HttpStatus.UNAUTHORIZED, message);
    }
}
