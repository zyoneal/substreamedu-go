package com.substreamedu.iam.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "sse_user")
@Setter
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {

  @Id
  private UUID id;

  @Column(unique = true, nullable = false)
  private String email;

  private boolean isActive;

  private String telegramToken;

  private boolean isPremium;

  private Integer translationCount;

  @CreationTimestamp
  @Column(updatable = false)
  private LocalDateTime createdAt;

}
