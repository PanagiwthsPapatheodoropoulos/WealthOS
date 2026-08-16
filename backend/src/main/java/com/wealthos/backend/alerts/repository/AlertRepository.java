package com.wealthos.backend.alerts.repository;

import com.wealthos.backend.alerts.entity.Alert;
import com.wealthos.backend.alerts.entity.AlertStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AlertRepository extends JpaRepository<Alert, UUID> {

    @Query("SELECT a FROM Alert a JOIN FETCH a.asset WHERE a.user.id = :userId ORDER BY a.createdAt DESC")
    List<Alert> findByUserIdOrderByCreatedAtDesc(@Param("userId") UUID userId);

    @Query("SELECT a FROM Alert a JOIN FETCH a.asset WHERE a.id = :id AND a.user.id = :userId")
    Optional<Alert> findByIdAndUserId(@Param("id") UUID id, @Param("userId") UUID userId);

    List<Alert> findByStatus(AlertStatus status);

    List<Alert> findByStatusAndAssetId(AlertStatus status, UUID assetId);

    @Query("SELECT a FROM Alert a JOIN FETCH a.asset JOIN FETCH a.user WHERE a.status = :status")
    List<Alert> findAllActiveWithAssetAndUser(@Param("status") AlertStatus status);

    @Query("SELECT a FROM Alert a JOIN FETCH a.asset JOIN FETCH a.user WHERE a.status = :status AND a.asset.id = :assetId")
    List<Alert> findActiveByAssetId(@Param("status") AlertStatus status, @Param("assetId") UUID assetId);
}
