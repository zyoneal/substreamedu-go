package com.substreamedu.media.mapper;

import com.substreamedu.media.dto.response.SubtitleResponseDto;
import com.substreamedu.media.model.Subtitle;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface SubtitleMapper {
    SubtitleResponseDto toResponseDto(Subtitle subtitle);
}
