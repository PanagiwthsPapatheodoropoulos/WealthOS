package com.wealthos.backend.common.exception;

import org.springframework.http.HttpStatus;

public final class BusinessRuleException extends ApiException {

    public BusinessRuleException(String message) {
        super(HttpStatus.UNPROCESSABLE_ENTITY, message);
    }
}
