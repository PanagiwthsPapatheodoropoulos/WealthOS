package com.wealthos.backend.common.util;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;

public final class DateTimeUtils {

    private DateTimeUtils() {
    }

    public static Instant nowUtc() {
        return Instant.now();
    }

    public static ZonedDateTime toUtcZoned(Instant instant) {
        return instant.atZone(ZoneOffset.UTC);
    }
}
