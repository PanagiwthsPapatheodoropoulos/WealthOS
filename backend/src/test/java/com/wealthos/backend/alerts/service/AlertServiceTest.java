package com.wealthos.backend.alerts.service;

import com.wealthos.backend.alerts.repository.AlertRepository;
import com.wealthos.backend.assets.service.AssetService;
import com.wealthos.backend.common.events.WealthEventPublisher;
import com.wealthos.backend.users.service.UserService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(MockitoExtension.class)
class AlertServiceTest {

    @Mock private AlertRepository alertRepository;
    @Mock private AssetService assetService;
    @Mock private UserService userService;
    @Mock private WealthEventPublisher eventPublisher;

    @InjectMocks private AlertService alertService;

    @Test
    void serviceLoads() {
        assertThat(alertService).isNotNull();
    }
}
