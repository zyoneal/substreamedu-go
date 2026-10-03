package com.substreamedu.iam.service.impl;

import com.substreamedu.iam.service.MailService;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class MailServiceImpl implements MailService {

  private final JavaMailSender mailSender;

  @Override
  public void sendOtpEmail(String email, String otp) {
    MimeMessage message = mailSender.createMimeMessage();
    try {
      MimeMessageHelper helper = new MimeMessageHelper(message, true);
      helper.setTo(email);
      helper.setSubject("Your access code");
      helper.setText(buildEmailBody(otp), true);
      mailSender.send(message);
      log.info("Access code sent to email: {}", email);
    } catch (MessagingException e) {
      log.error("Failed to send email to {}: {}", email, e.getMessage());
    }
  }

  private String buildEmailBody(String otp) {
    return "<html><body><h2>Your access code:</h2><p>Your code: <strong>" + otp + "</strong></p></body></html>";
  }

}
