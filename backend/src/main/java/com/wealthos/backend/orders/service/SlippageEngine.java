package com.wealthos.backend.orders.service;

import com.wealthos.backend.transactions.entity.TransactionType;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Component
public class SlippageEngine {

    private static final BigDecimal BASE_SPREAD_BPS = new BigDecimal("5");       // 0.05% baseline
    private static final BigDecimal IMPACT_COEFFICIENT = new BigDecimal("0.02"); // scales with notional
    private static final BigDecimal MAX_BPS = new BigDecimal("50");              // cap at 0.50%

    /** Applies a simplified market-impact model: bigger notional and market orders slip more. */
    public BigDecimal applySlippage(BigDecimal referencePrice, BigDecimal quantity, TransactionType action) {
        BigDecimal notional = referencePrice.multiply(quantity);
        BigDecimal impactBps = notional
                .divide(new BigDecimal("10000"), 4, RoundingMode.HALF_UP)
                .multiply(IMPACT_COEFFICIENT);
        BigDecimal totalBps = BASE_SPREAD_BPS.add(impactBps).min(MAX_BPS);

        BigDecimal direction = action == TransactionType.BUY ? BigDecimal.ONE : BigDecimal.ONE.negate();
        BigDecimal adjustment = referencePrice.multiply(totalBps)
                .divide(new BigDecimal("10000"), 6, RoundingMode.HALF_UP);

        return referencePrice.add(adjustment.multiply(direction));
    }

    public BigDecimal lastComputedBps(BigDecimal referencePrice, BigDecimal quantity) {
        BigDecimal notional = referencePrice.multiply(quantity);
        BigDecimal impactBps = notional
                .divide(new BigDecimal("10000"), 4, RoundingMode.HALF_UP)
                .multiply(IMPACT_COEFFICIENT);
        return BASE_SPREAD_BPS.add(impactBps).min(MAX_BPS);
    }
}
