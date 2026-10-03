package com.substreamedu.iam.service;

import com.substreamedu.iam.model.User;

import java.util.Optional;
import java.util.UUID;

public interface UserService {
  User findOrCreateByEmail(String email);

  User findOrCreateGoogleUser(String email);

  Optional<User> findByTelegramToken(String token);

  void updateTelegramToken(String email, String telegramToken);

  void activateUser(User user);

  Optional<User> findById(UUID id);

  Optional<User> findByEmail(String email);
}
