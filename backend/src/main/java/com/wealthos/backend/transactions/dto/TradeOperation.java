package com.wealthos.backend.transactions.dto;

import java.math.BigDecimal;
import java.util.UUID;

public sealed interface TradeOperation permits BuyRequest, SellRequest {
    UUID portfolioId();
    UUID assetId();
    BigDecimal quantity();
}
