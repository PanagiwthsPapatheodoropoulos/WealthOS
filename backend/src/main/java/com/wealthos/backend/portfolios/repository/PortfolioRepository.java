package com.wealthos.backend.portfolios.repository;

import com.wealthos.backend.portfolios.entity.Portfolio;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PortfolioRepository extends JpaRepository<Portfolio, UUID> {

    @Query("SELECT p FROM Portfolio p JOIN FETCH p.account WHERE p.account.user.id = :userId")
    List<Portfolio> findAllByUserId(@Param("userId") UUID userId);

    @Query("SELECT p FROM Portfolio p JOIN FETCH p.account WHERE p.id = :id AND p.account.user.id = :userId")
    Optional<Portfolio> findByIdAndUserId(@Param("id") UUID id, @Param("userId") UUID userId);
}
