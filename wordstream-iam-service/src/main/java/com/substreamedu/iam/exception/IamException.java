package com.substreamedu.iam.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public abstract class IamException extends RuntimeException {

  private final HttpStatus status;

  protected IamException(String message, HttpStatus status) {
    super(message);
    this.status = status;
  }

}
