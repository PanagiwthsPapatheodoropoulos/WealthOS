package com.wealthos.backend.transactions.service;

import lombok.RequiredArgsConstructor;
import com.wealthos.backend.transactions.entity.TransactionEvent;
import com.wealthos.backend.transactions.repository.TransactionEventRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 */
@Service
@RequiredArgsConstructor
public class TransactionEventStore {

    private final TransactionEventRepository repository;

    

    public void append(UUID transactionId, UUID userId, UUID portfolioId, String eventType, Map<String, Object> payload) {
        repository.save(TransactionEvent.builder()
                .transactionId(transactionId)
                .userId(userId)
                .portfolioId(portfolioId)
                .eventType(eventType)
                .payload(payload)
                .build());
    }

    public List<TransactionEvent> findByTransactionIdOrderByOccurredAtAsc(UUID transactionId) {
        return repository.findByTransactionIdOrderByOccurredAtAsc(transactionId);
    }
}
