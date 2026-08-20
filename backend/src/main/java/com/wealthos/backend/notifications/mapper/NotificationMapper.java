package com.wealthos.backend.notifications.mapper;

import com.wealthos.backend.notifications.dto.NotificationResponse;
import com.wealthos.backend.notifications.entity.Notification;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface NotificationMapper {

    NotificationResponse toResponse(Notification notification);
}
