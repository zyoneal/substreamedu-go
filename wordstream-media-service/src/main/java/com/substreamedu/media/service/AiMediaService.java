package com.substreamedu.media.service;

import com.substreamedu.media.dto.request.GenerateTextRequest;

public interface AiMediaService {
    String generateEducationalText(GenerateTextRequest request);
}
