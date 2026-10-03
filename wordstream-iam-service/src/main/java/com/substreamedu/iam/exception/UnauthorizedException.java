package com.substreamedu.iam.exception;

import org.springframework.http.HttpStatus;

public class UnauthorizedException extends IamException {

  public UnauthorizedException(String message) {
    super(message, HttpStatus.UNAUTHORIZED);
  }

}
