package com.substreamedu.iam.controller;

import com.substreamedu.iam.dto.response.ApiResponse;
import com.substreamedu.iam.dto.response.UserDto;
import com.substreamedu.iam.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/users")
public class UserController {

    private final UserService userService;

    @GetMapping("/{userId}")
    public ApiResponse<UserDto> getUserDetails(@PathVariable String userId) {
        log.info("Fetching user details for userId: {}", userId);

        if ("undefined".equals(userId) || "null".equals(userId)) {
            return ApiResponse.error("Invalid user ID");
        }

        try {
            UUID id = UUID.fromString(userId);
            return userService.findById(id)
                    .map(user -> ApiResponse.success(UserDto.builder()
                            .id(user.getId())
                            .email(user.getEmail())
                            .telegramToken(user.getTelegramToken())
                            .build()))
                    .orElseGet(() -> ApiResponse.error("User not found"));
        } catch (IllegalArgumentException e) {
            return ApiResponse.error("Invalid user ID format");
        }
    }
}
