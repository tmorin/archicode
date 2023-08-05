package io.morin.archicode;

public class ArchiCodeException extends RuntimeException {

    public ArchiCodeException(String message, Object... args) {
        super(String.format(message, args));
    }
}
