package com.wealthos.backend.users.service;

import com.wealthos.backend.users.mapper.UserMapper;
import com.wealthos.backend.users.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private UserMapper userMapper;

    @InjectMocks private UserService userService;

    @Test
    void serviceLoads() {
        assertThat(userService).isNotNull();
    }
}
