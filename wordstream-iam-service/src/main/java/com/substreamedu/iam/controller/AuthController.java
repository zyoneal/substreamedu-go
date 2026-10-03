package com.substreamedu.iam.controller;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.jackson2.JacksonFactory;
import com.substreamedu.iam.dto.request.AuthRequestDto;
import com.substreamedu.iam.dto.request.GoogleAuthRequest;
import com.substreamedu.iam.dto.request.OtpRequestDto;
import com.substreamedu.iam.dto.response.ApiResponse;
import com.substreamedu.iam.dto.response.AuthResponseDto;
import com.substreamedu.iam.exception.UnauthorizedException;
import com.substreamedu.iam.model.User;
import com.substreamedu.iam.security.JwtTokenProvider;
import com.substreamedu.iam.service.AuthenticationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collections;
import java.util.UUID;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/auth")
public class AuthController {

  private final AuthenticationService authenticationService;
  private final JwtTokenProvider jwtTokenProvider;

  @Value("${spring.security.oauth2.client.registration.google.client-id}")
  private String googleClientId;

  @PostMapping("/login")
  public ApiResponse<Void> login(@Valid @RequestBody AuthRequestDto authRequestDto) {
    authenticationService.sendMagicLink(authRequestDto.email(), UUID.randomUUID().toString());
    return ApiResponse.success("Magic link sent to your email", null);
  }

  @PostMapping("/verify")
  public ApiResponse<AuthResponseDto> verify(@Valid @RequestBody OtpRequestDto otpRequestDto) {
    return ApiResponse.success(
        authenticationService.verifyOtpAndAuthenticate(otpRequestDto.email(), otpRequestDto.otp()));
  }

  @PostMapping("/google")
  public ApiResponse<AuthResponseDto> loginWithGoogle(@Valid @RequestBody GoogleAuthRequest request) {
    try {
      GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(new NetHttpTransport(),
          JacksonFactory.getDefaultInstance())
          .setAudience(Collections.singletonList(googleClientId))
          .build();

      GoogleIdToken idToken = verifier.verify(request.token());
      if (idToken == null) {
        throw new UnauthorizedException("Invalid Google token");
      }

      String email = idToken.getPayload().getEmail();
      User user = authenticationService.findOrCreateGoogleUser(email);
      String jwtToken = jwtTokenProvider.generateToken(user);

      log.info("Google authentication successful for user: {}", email);
      return ApiResponse.success(new AuthResponseDto(user.getId(), jwtToken, user.getEmail()));
    } catch (UnauthorizedException ex) {
      throw ex;
    } catch (Exception e) {
      log.error("Google authentication failed", e);
      throw new UnauthorizedException("Google authentication failed");
    }
  }

  @GetMapping("/internal/user/by-telegram-token/{token}")
  public ApiResponse<User> getUserByTelegramToken(@PathVariable String token) {
    return authenticationService.findByTelegramToken(token)
        .map(ApiResponse::success)
        .orElseThrow(() -> new UnauthorizedException("User not found by token"));
  }

}
