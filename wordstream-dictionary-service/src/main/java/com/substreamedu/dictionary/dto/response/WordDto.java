package com.substreamedu.dictionary.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WordDto {
    private Long id;
    private String text;
    private String translation;
    private String definition;
    private String transcription;
    private String imageUrl;
    private String context;
}
