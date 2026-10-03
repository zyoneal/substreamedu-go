package com.substreamedu.iam.service.impl;

import com.substreamedu.iam.model.User;
import com.substreamedu.iam.repository.UserRepository;
import com.substreamedu.iam.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

  private final UserRepository userRepository;

  @Override
  @Transactional
  public User findOrCreateByEmail(String email) {
    return userRepository.findByEmail(email)
        .orElseGet(() -> {
          User newUser = User.builder()
              .id(UUID.randomUUID())
              .email(email)
              .isActive(true)
              .isPremium(false)
              .translationCount(0)
              .build();
          log.info("Created new user for email: {}", email);
          return userRepository.save(newUser);
        });
  }

  @Override
  @Transactional
  public User findOrCreateGoogleUser(String email) {
    return userRepository.findByEmail(email)
        .orElseGet(() -> {
          User newUser = User.builder()
              .id(UUID.randomUUID())
              .telegramToken(UUID.randomUUID().toString())
              .email(email)
              .isActive(true)
              .isPremium(false)
              .translationCount(0)
              .build();
          log.info("Created new Google user for email: {}", email);
          return userRepository.save(newUser);
        });
  }

  @Override
  @Transactional(readOnly = true)
  public Optional<User> findByTelegramToken(String token) {
    return userRepository.findByTelegramToken(token);
  }

  @Override
  @Transactional
  public void updateTelegramToken(String email, String telegramToken) {
    userRepository.findByEmail(email).ifPresent(user -> {
      user.setTelegramToken(telegramToken);
      userRepository.save(user);
    });
  }

  @Override
  @Transactional
  public void activateUser(User user) {
    user.setActive(true);
    userRepository.save(user);
  }

  @Override
  @Transactional(readOnly = true)
  public Optional<User> findById(UUID id) {
    return userRepository.findById(id);
  }

  @Override
  @Transactional(readOnly = true)
  public Optional<User> findByEmail(String email) {
    return userRepository.findByEmail(email);
  }

}
