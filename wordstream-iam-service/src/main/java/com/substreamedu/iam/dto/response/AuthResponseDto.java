package com.substreamedu.iam.dto.response;

import java.util.UUID;

public record AuthResponseDto(UUID userId, String token, String email) {

}
