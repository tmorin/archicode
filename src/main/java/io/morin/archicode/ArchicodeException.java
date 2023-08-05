package io.morin.archicode;

public class ArchicodeException extends RuntimeException {

    public ArchicodeException(String message, Object... args) {
        super(String.format(message, args));
    }
}
