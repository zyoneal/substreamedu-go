package com.substreamedu.iam.service;

import com.substreamedu.iam.dto.response.AuthResponseDto;
import com.substreamedu.iam.model.User;

public interface AuthenticationService {

  AuthResponseDto verifyOtpAndAuthenticate(String email, String otp);

  void sendMagicLink(String email, String telegramToken);

  User findOrCreateGoogleUser(String email);

  java.util.Optional<com.substreamedu.iam.model.User> findByTelegramToken(String token);

}
