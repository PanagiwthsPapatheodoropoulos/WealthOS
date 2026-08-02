package com.wealthos.backend.common.exception;

import org.springframework.http.HttpStatus;

public final class TooManyRequestsException extends ApiException {

    public TooManyRequestsException(String message) {
        super(HttpStatus.TOO_MANY_REQUESTS, message);
    }
}
