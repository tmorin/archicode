package io.morin.archicode.resource;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marks a key that the class needs ({@code @NonNull} of Lombok, which the JVM does not keep) where {@code @JsonProperty(required = true)}
 * is not written, so that the schema of {@code archicode query schemas manifest} can say it is required. It changes nothing in how
 * a file is read, and nothing in what {@code query schemas workspace} prints (that schema is written from {@code JsonProperty} alone).
 */
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({ ElementType.FIELD, ElementType.METHOD })
public @interface Required {}
