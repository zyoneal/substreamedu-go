package com.substreamedu.dictionary.config;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Annotation to mark methods that make external API calls.
 * Used by LoggingAspect to provide detailed logging for external integrations.
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface LogExternalCall {
    String value() default "";
}
