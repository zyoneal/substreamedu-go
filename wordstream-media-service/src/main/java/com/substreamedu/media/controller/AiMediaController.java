package com.substreamedu.media.controller;

import com.substreamedu.media.dto.request.GenerateTextRequest;
import com.substreamedu.media.dto.response.ApiResponse;
import com.substreamedu.media.service.AiMediaService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/api/media/ai")
@RequiredArgsConstructor
@Validated
public class AiMediaController {

    private final AiMediaService aiMediaService;

    @PostMapping("/generate-text")
    public ApiResponse<String> generateText(@RequestBody @Validated GenerateTextRequest request) {
        log.info("AI Text generation request for level: {}", request.cefrLevel());
        return ApiResponse.success(aiMediaService.generateEducationalText(request));
    }

}
