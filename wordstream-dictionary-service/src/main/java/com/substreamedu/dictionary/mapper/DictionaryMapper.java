package com.substreamedu.dictionary.mapper;

import com.substreamedu.dictionary.dto.response.DictionaryItemDto;
import com.substreamedu.dictionary.model.Dictionary;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface DictionaryMapper {
    DictionaryItemDto toDictionaryItemDto(Dictionary dictionary);
}
