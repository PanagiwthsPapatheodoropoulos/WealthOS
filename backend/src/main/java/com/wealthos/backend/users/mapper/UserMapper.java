package com.wealthos.backend.users.mapper;

import com.wealthos.backend.users.dto.UserResponse;
import com.wealthos.backend.users.entity.User;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface UserMapper {

    UserResponse toResponse(User user);
}
