package com.wealthos.backend.users.repository;

import com.wealthos.backend.support.AbstractIntegrationTest;
import com.wealthos.backend.users.enums.Role;
import com.wealthos.backend.users.entity.User;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class UserRepositoryTest extends AbstractIntegrationTest {

    @Autowired
    private UserRepository userRepository;

    @Test
    void findByEmailReturnsSavedUser() {
        userRepository.save(User.builder()
                .email("repo-test@example.com").passwordHash("hashed")
                .firstName("Repo").lastName("Test").role(Role.USER).build());

        assertThat(userRepository.findByEmail("repo-test@example.com")).isPresent();
        assertThat(userRepository.existsByEmail("repo-test@example.com")).isTrue();
        assertThat(userRepository.existsByEmail("nope@example.com")).isFalse();
    }

    @Test
    void uniqueEmailConstraintIsEnforcedAtDatabaseLevel() {
        userRepository.saveAndFlush(User.builder()
                .email("dup@example.com").passwordHash("h1")
                .firstName("A").lastName("B").role(Role.USER).build());

        assertThatThrownBy(() -> userRepository.saveAndFlush(User.builder()
                .email("dup@example.com").passwordHash("h2")
                .firstName("C").lastName("D").role(Role.USER).build()))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void prePersistDefaultsRoleToUserAndSetsActiveTrue() {
        User saved = userRepository.save(User.builder()
                .email("defaults@example.com").passwordHash("h")
                .firstName("D").lastName("E").build()); 

        assertThat(saved.getRole()).isEqualTo(Role.USER);
        assertThat(saved.isActive()).isTrue();
        assertThat(saved.getCreatedAt()).isNotNull();
    }
}
