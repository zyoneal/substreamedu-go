package com.substreamedu.dictionary.config;

import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.stream.Collectors;

/**
 * AOP-based logging aspect for service layer methods.
 * Automatically logs method entry, exit, duration, and exceptions.
 */
@Slf4j
@Aspect
@Component
public class LoggingAspect {

    private static final int MAX_ARG_LENGTH = 100;

    /**
     * Log all service layer method executions
     */
    @Around("execution(* com.substreamedu.dictionary.service.impl..*(..))")
    public Object logServiceMethods(ProceedingJoinPoint joinPoint) throws Throwable {
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        String className = signature.getDeclaringType().getSimpleName();
        String methodName = signature.getName();
        String fullMethodName = className + "." + methodName;

        // Sanitize and truncate arguments
        String args = sanitizeArgs(joinPoint.getArgs());

        long startTime = System.currentTimeMillis();

        log.debug("▶ Method Entry | method={} | args={}", fullMethodName, args);

        try {
            Object result = joinPoint.proceed();
            long duration = System.currentTimeMillis() - startTime;

            // Log slow methods
            if (duration > 500) {
                log.warn("⚠ Slow Method | method={} | duration={}ms | threshold=500ms",
                        fullMethodName, duration);
            } else {
                log.debug("◀ Method Exit | method={} | duration={}ms", fullMethodName, duration);
            }

            return result;

        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            log.error("✗ Method Failed | method={} | duration={}ms | error={} | message={}",
                    fullMethodName, duration, e.getClass().getSimpleName(), e.getMessage());
            throw e;
        }
    }

    /**
     * Log repository layer method executions (focus on slow queries)
     */
    @Around("execution(* com.substreamedu.dictionary.repository..*(..))")
    public Object logRepositoryMethods(ProceedingJoinPoint joinPoint) throws Throwable {
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        String className = signature.getDeclaringType().getSimpleName();
        String methodName = signature.getName();
        String fullMethodName = className + "." + methodName;

        long startTime = System.currentTimeMillis();

        try {
            Object result = joinPoint.proceed();
            long duration = System.currentTimeMillis() - startTime;

            // Only log slow queries
            if (duration > 100) {
                log.warn("⚠ Slow Query | repository={} | method={} | duration={}ms | threshold=100ms",
                        className, methodName, duration);
            } else {
                log.trace("DB Query | method={} | duration={}ms", fullMethodName, duration);
            }

            return result;

        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            log.error("✗ Query Failed | method={} | duration={}ms | error={}",
                    fullMethodName, duration, e.getClass().getSimpleName());
            throw e;
        }
    }

    /**
     * Log external API calls (translation services, etc.)
     */
    @Around("@annotation(com.substreamedu.dictionary.config.LogExternalCall)")
    public Object logExternalCalls(ProceedingJoinPoint joinPoint) throws Throwable {
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        String methodName = signature.getName();

        long startTime = System.currentTimeMillis();

        log.info("⇄ External API Call Started | method={}", methodName);

        try {
            Object result = joinPoint.proceed();
            long duration = System.currentTimeMillis() - startTime;

            log.info("✓ External API Call Success | method={} | duration={}ms", methodName, duration);

            // Log slow external calls
            if (duration > 2000) {
                log.warn("⚠ Slow External API | method={} | duration={}ms | threshold=2000ms",
                        methodName, duration);
            }

            return result;

        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            log.error("✗ External API Call Failed | method={} | duration={}ms | error={} | message={}",
                    methodName, duration, e.getClass().getSimpleName(), e.getMessage());
            throw e;
        }
    }

    private String sanitizeArgs(Object[] args) {
        if (args == null || args.length == 0) {
            return "[]";
        }

        return Arrays.stream(args)
                .map(this::sanitizeArg)
                .collect(Collectors.joining(", ", "[", "]"));
    }

    private String sanitizeArg(Object arg) {
        if (arg == null) {
            return "null";
        }

        String argString = arg.toString();

        // Sanitize sensitive data
        if (argString.toLowerCase().contains("password") ||
                argString.toLowerCase().contains("token") ||
                argString.toLowerCase().contains("secret")) {
            return "[REDACTED]";
        }

        // Truncate long arguments
        if (argString.length() > MAX_ARG_LENGTH) {
            return argString.substring(0, MAX_ARG_LENGTH) + "...";
        }

        return argString;
    }
}
