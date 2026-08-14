package com.wealthos.backend.transactions.repository;

import com.wealthos.backend.transactions.entity.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface TransactionRepository extends JpaRepository<Transaction, UUID> {

    @Query("SELECT t FROM Transaction t JOIN FETCH t.portfolio JOIN FETCH t.asset WHERE t.portfolio.id = :portfolioId ORDER BY t.executedAt DESC")
    List<Transaction> findByPortfolioIdOrderByExecutedAtDesc(@Param("portfolioId") UUID portfolioId);
}
