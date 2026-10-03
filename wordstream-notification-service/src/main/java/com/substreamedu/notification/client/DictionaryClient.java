package com.substreamedu.notification.client;

import com.substreamedu.notification.dto.response.ApiResponse;
import com.substreamedu.notification.dto.response.DictionaryItemResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@FeignClient(name = "dictionary-service", url = "${services.dictionary.url}")
public interface DictionaryClient {

        @GetMapping("/dictionary/random")
        ApiResponse<DictionaryItemResponse> getRandomWord(@RequestHeader("X-User-Id") String userId);

        @GetMapping("/dictionary/srs/today")
        ApiResponse<List<DictionaryItemResponse>> getSrsCardsForToday(@RequestHeader("X-User-Id") String userId);

        @GetMapping("/dictionary/streak")
        ApiResponse<Integer> calculateUserStreak(@RequestHeader("X-User-Id") String userId);

        @PostMapping("/dictionary/item/{id}/review")
        ApiResponse<Void> handleUserAnswer(
                        @PathVariable("id") Long id,
                        @RequestParam("choice") String choice,
                        @RequestParam("duration") Integer duration);

        @PostMapping("/dictionary/item/{id}/review2")
        ApiResponse<DictionaryItemResponse> reviewCard2Button(
                        @PathVariable("id") Long id,
                        @RequestBody Map<String, Object> reviewData);
}
