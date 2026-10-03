package com.substreamedu.iam.security;

import com.substreamedu.iam.model.User;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@Component
public class JwtTokenProvider {

  @Value("${spring.security.jwt.secret-key}")
  private String secretKey;

  @Value("${spring.security.jwt.accessTokenExpirationMs}")
  private long jwtExpirationInMs;

  public String generateToken(User user) {
    Map<String, Object> claims = new HashMap<>();
    claims.put("id", user.getId());

    return Jwts.builder()
        .setClaims(claims)
        .setSubject(user.getEmail())
        .setIssuedAt(new Date())
        .setExpiration(new Date(System.currentTimeMillis() + jwtExpirationInMs))
        .signWith(getSigningKey(), SignatureAlgorithm.HS256)
        .compact();
  }

  private SecretKey getSigningKey() {
    byte[] keyBytes = secretKey.getBytes(StandardCharsets.UTF_8);
    return Keys.hmacShaKeyFor(keyBytes);
  }

}
