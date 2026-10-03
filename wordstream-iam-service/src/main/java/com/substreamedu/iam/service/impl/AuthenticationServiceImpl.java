package com.substreamedu.iam.service.impl;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.substreamedu.iam.dto.response.AuthResponseDto;
import com.substreamedu.iam.exception.UnauthorizedException;
import com.substreamedu.iam.model.User;
import com.substreamedu.iam.security.JwtTokenProvider;
import com.substreamedu.iam.service.AuthenticationService;
import com.substreamedu.iam.service.MailService;
import com.substreamedu.iam.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Random;
import java.util.concurrent.TimeUnit;

@Service
@Slf4j
@RequiredArgsConstructor
public class AuthenticationServiceImpl implements AuthenticationService {

  private final UserService userService;
  private final MailService mailService;
  private final JwtTokenProvider jwtTokenProvider;

  private final Cache<String, String> otpStorage = Caffeine.newBuilder()
      .expireAfterWrite(5, TimeUnit.MINUTES)
      .build();

  @Override
  @Transactional
  public AuthResponseDto verifyOtpAndAuthenticate(String email, String otp) {
    String validOtp = otpStorage.getIfPresent(email);
    String trimmedOtp = otp != null ? otp.trim() : null;

    if (validOtp == null || !validOtp.equals(trimmedOtp)) {
      log.warn("Authentication failed: invalid OTP for email {}", email);
      throw new UnauthorizedException("Invalid or expired OTP");
    }

    otpStorage.invalidate(email);

    User user = userService.findOrCreateByEmail(email);
    userService.activateUser(user);

    String token = jwtTokenProvider.generateToken(user);

    log.info("Successful authentication for user: {}", email);

    return new AuthResponseDto(user.getId(), token, user.getEmail());
  }

  @Override
  public void sendMagicLink(String email, String telegramToken) {
    String otp = generateOtp();
    otpStorage.put(email, otp);

    mailService.sendOtpEmail(email, otp);
    userService.updateTelegramToken(email, telegramToken);
  }

  @Override
  public User findOrCreateGoogleUser(String email) {
    return userService.findOrCreateGoogleUser(email);
  }

  private String generateOtp() {
    Random random = new Random();
    int otp = 100000 + random.nextInt(900000);
    return String.valueOf(otp);
  }

  @Override
  public java.util.Optional<User> findByTelegramToken(String token) {
    return userService.findByTelegramToken(token);
  }

}
