package com.substreamedu.dictionary.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.ContentCachingRequestWrapper;
import org.springframework.web.util.ContentCachingResponseWrapper;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

/**
 * Production-grade HTTP request/response logging filter.
 * Captures correlation IDs, request/response details, and performance metrics.
 */
@Slf4j
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class LoggingFilter extends OncePerRequestFilter {

    private static final String CORRELATION_ID_HEADER = "X-Correlation-ID";
    private static final String USER_ID_HEADER = "X-User-Id";
    private static final String TRACE_ID_KEY = "traceId";
    private static final String USER_ID_KEY = "userId";
    private static final String REQUEST_METHOD_KEY = "method";
    private static final String REQUEST_PATH_KEY = "path";
    private static final int MAX_PAYLOAD_LENGTH = 1000;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        // Skip logging for actuator endpoints
        if (request.getRequestURI().contains("/actuator")) {
            filterChain.doFilter(request, response);
            return;
        }

        // Wrap request and response for content caching
        ContentCachingRequestWrapper wrappedRequest = new ContentCachingRequestWrapper(request);
        ContentCachingResponseWrapper wrappedResponse = new ContentCachingResponseWrapper(response);

        // Setup MDC context
        String correlationId = getOrGenerateCorrelationId(request);
        String userId = request.getHeader(USER_ID_HEADER);
        String method = request.getMethod();
        String path = request.getRequestURI();

        MDC.put(TRACE_ID_KEY, correlationId);
        MDC.put(USER_ID_KEY, userId != null ? userId : "anonymous");
        MDC.put(REQUEST_METHOD_KEY, method);
        MDC.put(REQUEST_PATH_KEY, path);

        long startTime = System.currentTimeMillis();

        try {
            // Log incoming request
            logRequest(wrappedRequest, correlationId);

            // Process request
            filterChain.doFilter(wrappedRequest, wrappedResponse);

        } finally {
            long duration = System.currentTimeMillis() - startTime;

            // Log response
            logResponse(wrappedResponse, duration, correlationId);

            // Copy cached response content to actual response
            wrappedResponse.copyBodyToResponse();

            // Clear MDC
            MDC.clear();
        }
    }

    private String getOrGenerateCorrelationId(HttpServletRequest request) {
        String correlationId = request.getHeader(CORRELATION_ID_HEADER);
        if (correlationId == null || correlationId.isEmpty()) {
            correlationId = UUID.randomUUID().toString();
        }
        return correlationId;
    }

    private void logRequest(ContentCachingRequestWrapper request, String correlationId) {
        String method = request.getMethod();
        String uri = request.getRequestURI();
        String queryString = request.getQueryString();
        String contentType = request.getContentType();

        log.info("→ HTTP Request | correlationId={} | method={} | uri={} | query={} | contentType={}",
                correlationId, method, uri, queryString, contentType);

        // Log request body for POST/PUT/PATCH (with size limit)
        if (shouldLogRequestBody(method, contentType)) {
            String payload = getRequestPayload(request);
            if (payload != null && !payload.isEmpty()) {
                log.debug("→ Request Body | correlationId={} | payload={}", correlationId, payload);
            }
        }
    }

    private void logResponse(ContentCachingResponseWrapper response, long duration, String correlationId) {
        int status = response.getStatus();
        String contentType = response.getContentType();
        int contentLength = response.getContentSize();

        // Determine log level based on status code
        if (status >= 500) {
            log.error("← HTTP Response | correlationId={} | status={} | duration={}ms | contentType={} | size={}",
                    correlationId, status, duration, contentType, contentLength);
        } else if (status >= 400) {
            log.warn("← HTTP Response | correlationId={} | status={} | duration={}ms | contentType={} | size={}",
                    correlationId, status, duration, contentType, contentLength);
        } else {
            log.info("← HTTP Response | correlationId={} | status={} | duration={}ms | contentType={} | size={}",
                    correlationId, status, duration, contentType, contentLength);
        }

        // Log slow requests
        if (duration > 1000) {
            log.warn("⚠ Slow Request Detected | correlationId={} | duration={}ms | threshold=1000ms",
                    correlationId, duration);
        }

        // Log response body for errors (with size limit)
        if (status >= 400) {
            String payload = getResponsePayload(response);
            if (payload != null && !payload.isEmpty()) {
                log.debug("← Response Body | correlationId={} | payload={}", correlationId, payload);
            }
        }
    }

    private boolean shouldLogRequestBody(String method, String contentType) {
        return ("POST".equals(method) || "PUT".equals(method) || "PATCH".equals(method))
                && contentType != null
                && (contentType.contains("application/json") || contentType.contains("application/xml"));
    }

    private String getRequestPayload(ContentCachingRequestWrapper request) {
        byte[] content = request.getContentAsByteArray();
        if (content.length > 0) {
            String payload = new String(content, StandardCharsets.UTF_8);
            return truncate(payload, MAX_PAYLOAD_LENGTH);
        }
        return null;
    }

    private String getResponsePayload(ContentCachingResponseWrapper response) {
        byte[] content = response.getContentAsByteArray();
        if (content.length > 0) {
            String payload = new String(content, StandardCharsets.UTF_8);
            return truncate(payload, MAX_PAYLOAD_LENGTH);
        }
        return null;
    }

    private String truncate(String str, int maxLength) {
        if (str == null || str.length() <= maxLength) {
            return str;
        }
        return str.substring(0, maxLength) + "... [truncated]";
    }
}
