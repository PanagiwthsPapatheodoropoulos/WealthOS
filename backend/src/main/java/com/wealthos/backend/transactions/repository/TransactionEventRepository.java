package com.wealthos.backend.transactions.repository;

import com.wealthos.backend.transactions.entity.TransactionEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TransactionEventRepository extends JpaRepository<TransactionEvent, UUID> {
    List<TransactionEvent> findByTransactionIdOrderByOccurredAtAsc(UUID transactionId);
}
