package com.substreamedu.notification.client;

import com.substreamedu.notification.dto.response.ApiResponse;
import com.substreamedu.notification.dto.response.UserResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "iam-service", url = "${services.iam.url}")
public interface IamClient {

    @GetMapping("/internal/user/by-telegram-token/{token}")
    ApiResponse<UserResponse> getUserByTelegramToken(@PathVariable("token") String token);
}
